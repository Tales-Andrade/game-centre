const UserModel = require('../models/user');
const ReviewModel = require('../models/review');
const FavoriteModel = require('../models/favorite');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HttpException = require('../utils/HttpException');
const Role = require('../utils/userRoles');
const { User } = require('../utils/userRoles');

require('dotenv').config();

class UserController {
    renderAdmin = async (req, res, next) => {
        let userList = await UserModel.find();

        if (!userList.length) {
            req.flash('error', 'Users not found!');
            return res.redirect('/');
        }

        userList = userList.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        res.render('users/admin', { userList });
    };

    showUser = async (req, res, next) => {
        const { password, ...user } = await UserModel.findOne({ id: req.params.id });

        res.render('users/show', { user });
    };

    updateUser = async (req, res, next) => {
        this.isValid(req);

        await this.hashPassword(req);

        if (req.body.admin === process.env.ADMIN) {
            req.body.role = Role.Admin;
        }

        const { confirm_password, _csrf, admin, ...restOfUpdates } = req.body;

        const result = await UserModel.update(restOfUpdates, req.params.id);

        if (!result) {
            req.flash('error', 'User update failed!');
            return res.redirect('/');
        }

        const { affectedRows, changedRows } = result;

        if (affectedRows && changedRows) {
            req.flash('success', 'User successfully updated!');
        } else {
            req.flash('error', 'User update failed!');
        }

        res.redirect(`/profiles/${req.params.id}`);
    };

    deleteUser = async (req, res, next) => {
        const reviews = await ReviewModel.find({ author: req.params.id });

        for (let review of reviews) {
            await ReviewModel.findByIdAndDelete({ _id: review._id });
        }

        await FavoriteModel.findOneAndDelete({ user: req.params.id });

        const result = await UserModel.delete(req.params.id);

        if (!result) {
            req.flash('error', 'User not found!');
            return res.redirect('/');
        }

        req.flash('success', 'User successfully deleted!');

        if (req.session.user.role !== Role.Admin) {
            return res.redirect('/logout');
        }

        res.redirect('/admin');
    };

    renderEditForm = async (req, res, next) => {
        const user = await UserModel.findOne({ id: req.params.id });

        if (!user) {
            req.flash('error', 'User not found!');
            return res.redirect('/');
        }

        res.render('users/edit', { user });
    }

    renderRegister = (req, res) => {
        res.render('users/register');
    };

    createUser = async (req, res, next) => {
        this.isValid(req);

        await this.hashPassword(req);

        if (req.body.admin === process.env.ADMIN) {
            req.body.role = Role.Admin;
        }

        const result = await UserModel.create(req.body);

        if (!result) {
            req.flash('error', 'An error has occurred in registration!');
            return res.redirect('/register');
        }

        const user = await UserModel.findOne({ email: req.body.email });
        const favorites = new FavoriteModel();
        favorites.user = user.id;
        favorites.games = [];
        await favorites.save();

        req.flash('success', 'Your registration has been completed successfully!');
        res.redirect('/login');
    };

    renderLogin = (req, res) => {
        res.render('users/login');
    };

    userLogin = async (req, res, next) => {
        this.isValid(req);

        const { email, password: pass } = req.body;

        const user = await UserModel.findOne({ email });

        if (!user) {
            req.flash('error', 'You do not have an account associated to this email!');
            return res.redirect('/register');
        }

        const isMatch = await bcrypt.compare(pass, user.password);

        if (!isMatch) {
            req.flash('error', 'Incorrect Password!');
            return res.redirect('/login');
        }

        const secretKey = process.env.SECRET_JWT || '';
        const token = jwt.sign({ user_id: user.id.toString() }, secretKey, { expiresIn: '24h' });

        req.session.token = token;
        req.session.user = user;
        let url = (user.role === Role.Admin) ? '/admin' : '/games';

        res.redirect(url);
    };

    userLogout = async (req, res, next) => {
        req.session.token = null;
        req.session.user = null;
        req.flash('success', 'Successfully logged out!');
        res.redirect('/');
    };

    isValid = req => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            console.log(errors);
            throw new HttpException(400, 'Validation failed', errors);
        }
    }

    hashPassword = async (req) => {
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, 12);
        }
    }
}

module.exports = new UserController;
const axios = require('axios');
const ReviewModel = require('../models/review');
const UserModel = require('../models/user');
const FavoriteModel = require('../models/favorite');
const { createDate } = require('../utils/date');
const { getColor } = require('../utils/color');

class GameController {
    renderGames = async (req, res) => {
        const gamesAPI = await axios({
            method: 'post',
            url: 'https://api.igdb.com/v4/games',
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
                'Accept': 'application/json'
            },
            data: 'fields name, rating, cover.*; where rating < 100 & rating > 85 & follows > 50; limit 12;'
        });

        if (!gamesAPI.data.length) {
            req.flash('error', 'IGDB API call failed!');
            return res.redirect('/');
        }

        let colors = [];
        let texts = [];

        for (let i = 0; i < gamesAPI.data.length; i++) {
            const { color, text } = getColor(gamesAPI.data[i].rating);
            colors.push(color);
            texts.push(text);
        }

        res.render('games/index', { games: gamesAPI.data, colors, texts });
    }

    searchGames = async (req, res) => {
        const search = req.body.search;

        const gamesAPI = await axios({
            method: 'post',
            url: 'https://api.igdb.com/v4/games',
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
                'Accept': 'application/json'
            },
            data: `search "${search}"; fields name, rating, cover.*; limit 500;`
        });

        if (!gamesAPI.data.length) {
            req.flash('error', 'IGDB API call failed!');
            return res.redirect('/');
        }

        let colors = [];
        let texts = [];

        for (let i = 0; i < gamesAPI.data.length; i++) {
            const { color, text } = getColor(gamesAPI.data[i].rating);
            colors.push(color);
            texts.push(text);
        }

        res.render('games/index', { games: gamesAPI.data, colors, texts });
    }

    showGame = async (req, res) => {
        const gamesAPI = await axios({
            method: 'post',
            url: 'https://api.igdb.com/v4/games',
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
                'Accept': 'application/json'
            },
            data: `fields name, rating, summary, genres.*, first_release_date, platforms.*, cover.*; where id = ${req.params.id};`
        });

        if (!gamesAPI.data.length) {
            req.flash('error', 'IGDB API call failed!');
            return res.redirect('/');
        }

        const user = req.session.user;

        let favorites = [];

        if (user) {
            favorites = await FavoriteModel.findOne({ user: user.id });
            favorites = favorites.games;
        }

        const reviews = await ReviewModel.find({ game: req.params.id });
        const users = [];

        for (let review of reviews) {
            const user = await UserModel.findOne({ id: review.author });
            users.push(user);
        }

        const date = createDate(gamesAPI.data[0].first_release_date);
        const { color, text } = getColor(gamesAPI.data[0].rating);

        res.render('games/show', { game: gamesAPI.data[0], favorites, reviews, user, users, date, color, text });
    }
}

module.exports = new GameController;
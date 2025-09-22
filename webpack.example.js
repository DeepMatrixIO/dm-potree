

import path from 'path';
import HtmlPlugin from 'html-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

import CopyPlugin from 'copy-webpack-plugin';
import config from './webpack.config.js';

export default {
	mode: 'development',
	context: path.resolve('./example'),
	entry: './index.js',

		output: {
		filename: 'bundle.js',
		path: path.resolve('dist'),
		clean: true,
		// publicPath: './',
	},
	// devtool: 'source-map',
	devServer: {
		compress: true,
		port: 5200,
		// client: {
		// 	logging: 'verbose', // Add this line for verbose client logs
		// 	overlay: true,      // Shows errors/warnings in browser overlay
		// },
		setupMiddlewares: (middlewares, devServer) => {
			devServer.app.use((req, res, next) => {
				console.log(`[HTTP] ${req.method} ${req.url}`);
				next();
			});
			return middlewares;
		},
		client: {
			overlay: true,
		},
		// static: './public', // Add this to serve static files from public/

	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
	},
	// module: {
	// 	rules: config.module.rules.concat([
	// 		{
	// 			test: /\.html$/,
	// 			use: [
	// 				{
	// 					loader: 'html-loader',
	// 					options: {minimize: true},
	// 				},
	// 			],
	// 		},
	// 		{
	// 			test: /\.css$/,
	// 			use: ['style-loader', 'css-loader'],
	// 		},
	// 	]),
	// },
	plugins: [
		new CopyPlugin({
			patterns: [{
				from: "data",
				to: "data"
			}]
		}),
		// new HtmlPlugin(),

		new HtmlWebpackPlugin({
			title: 'Webpack App',
		})

	],

	stats: {
		all: true,
		errors: true,
		warnings: true,
		logging: 'verbose',
	},

};



import path from 'path';
import {fileURLToPath} from 'url'; // 1. Import this


import HtmlPlugin from 'html-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

import CopyPlugin from 'copy-webpack-plugin';
import config from './webpack.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __context = path.resolve('./example');
console.log(__filename);
console.log(__dirname);



const serveConfig = {
	mode: 'development',
	context: __context,
	entry: './index.js',

	// output: {
	// 	filename: 'bundle.js',
	// 	path: path.resolve('dist'),
	// 	clean: true,
	// 	// publicPath: './',
	// },
	// devtool: 'source-map',
	devServer: {
		compress: false,
		// compress: true,

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
		static: [
			//way to permisive
			{
				directory: path.resolve('./example'), // Serve example folder content
				publicPath: '/', // Access via http://localhost:5200/
			},
			{
				directory: path.resolve('pointclouds'), // Expose pointclouds folder
				publicPath: '/pointclouds', // Access via http://localhost:5200/pointclouds/
			},
			// {
			// 	directory: path.resolve('./build'), // Expose build folder (for potree resources)
			// 	publicPath: '/build',
			// },

			{
				directory: path.resolve('libs/'), // Expose libs folder
				publicPath: '/libs',
			},


			{
				directory: path.resolve('resources/images'), // Expose libs folder
				publicPath: '/resources/images',
			},


			{
				directory: path.resolve('resources/textures'), // Expose libs folder
				publicPath: '/textures',
			}
			,
			{
				directory: path.resolve('resources/images'), // Expose libs folder
				publicPath: '/images',
			},
			{
				directory: path.resolve('resources/icons'), // Expose libs folder
				publicPath: '/icons',
			}

		],
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
			patterns: [
				{
					from: "data",
					to: "data"
				},
				{
					from: path.resolve(__dirname, 'src/workers'),
					to: path.resolve(__context, 'workers'),
				}
				,
				{
					from: path.resolve(__dirname, 'src/viewer/potree.css'),
					to: path.resolve(__dirname, 'dist/potree.css'),
				}


			]
		}),



		// new HtmlPlugin(),

		new HtmlWebpackPlugin({
			title: 'Potree Webpack app',
		})

	],

	stats: {
		all: true,
		errors: true,
		warnings: true,
		logging: 'verbose',
	},

};

console.log('\n=== WEBPACK CONFIGURATION ===');
console.log('Context:', serveConfig.context);
console.log('Entry:', serveConfig.entry);
console.log('\nStatic directories being served:');
serveConfig.devServer.static.forEach((staticConfig, index) => {
	console.log(`  [${index}] ${staticConfig.directory} -> ${staticConfig.publicPath}`);
});
console.log('\nCopy patterns:');
serveConfig.plugins[0].patterns.forEach((pattern, index) => {
	console.log(`  [${index}] ${pattern.from} -> ${pattern.to}`);
});
console.log('=================================\n');

export default serveConfig;

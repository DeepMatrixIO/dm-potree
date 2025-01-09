import CopyPlugin from 'copy-webpack-plugin';
import HtmlPlugin from 'html-webpack-plugin';
import path from 'path';

import config from './webpack.config.js';

export default {
	context: path.resolve('./example_module'),
	entry: './main.ts',
	output: {
		filename: 'example.bundle.js',
		path: path.resolve('build'),
	},
	devtool: 'source-map',
	devServer: {
		compress: true,
		port: 5000,
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
	},
	module: {
		rules: config.module.rules.concat([
			{
				test: /\.html$/,
				use: [
					{
						loader: 'html-loader',
						options: {minimize: true},
					},
				],
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
		]),
	},
	plugins: [
		new CopyPlugin({
			patterns: [{
				from: "data",
				to: "data"
			}]
		}),
		new HtmlPlugin()
	],
};

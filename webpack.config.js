const path = require('path');
const fs = require('fs');

module.exports = {
	entry: './src/potree_module.js', // Change this to your main entry file
	// output: {
	// 	filename: 'bundle.js',
	// 	path: path.resolve(__dirname, 'dist'),
	// 	clean: true,
	// },
	output: {
		path: path.resolve('dist'),
		filename: 'potree_module_index.js',
		library: {
			type: 'module',
		},
		clean: true
	},
	stats: {
		children: true,
	},
	experiments: {
		outputModule: true,
	},
		optimization: {
        minimize: false,
    },
	externals: ['three'],

	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader', // If you use Babel
				},
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
			// Add more loaders as needed (e.g., for images, fonts)
			{
				test: /\.(vs|fs)$/,
				loader: 'raw-loader',
				options: {
					esModule: true,
				},
			},
			{
				test: /\.worker\.js$/,
				loader: 'worker-loader',
				options: {inline: 'no-fallback'},
			},
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
				exclude: /node_modules/,
			},


						{
				test: /\.js?$/,
				loader: 'babel-loader',
				exclude: /node_modules/,
			},

		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	devtool: 'source-map',
	devServer: {
		static: './dist',
		hot: true,
		open: true,
	},
};
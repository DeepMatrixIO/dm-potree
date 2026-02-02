const path = require('path');
const fs = require('fs');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	entry: './src/potree_module.js', // Change this to your main entry file
	// output: {
	// 	filename: 'bundle.js',
	// 	path: path.resolve(__dirname, 'dist'),
	// 	clean: true,
	// },
	output: {
		path: path.resolve('dist'),
		filename: 'potree_module.js',
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

    plugins: [
        new CopyPlugin({
            patterns: [
                // Adjust 'from' to point to your source static folder (e.g., 'resources', 'public')
                { from: 'resources', to: 'resources' },
				{ from: 'src/viewer/potree.css', to: 'potree/potree.css' },
				{ from: 'src/viewer/*.html', to: 'potree/[name][ext]' },
				{ from: 'src/workers/**/*', to: 'workers/[name][ext]' },
				{ from: 'src/Version.js', to: 'Version.js' },
				{ from: 'src/loader', to: 'loader' },
				{ from: 'libs/copc', to: 'libs/copc' },
				{ from: 'libs/plasio/workers', to: 'libs/plasio/workers' },
				{ from: 'libs/zstd-codec', to: 'libs/zstd-codec' },
				{ from: 'libs/ept', to: 'libs/ept' },

                // You can add more patterns here
                // { from: 'libs', to: 'libs' },
            ],
        }),
    ],

	externals: ['three', '@tweenjs/tween.js','proj4','i18next'],

	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: [
					/node_modules/,
					/PotreeOLD\.js$/
				],
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
		entry	: './example/index.js',
	},

};
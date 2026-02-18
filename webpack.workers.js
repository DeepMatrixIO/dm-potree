import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
	mode: 'production',
	entry: {
		'BinaryDecoderWorker': './src/workers/BinaryDecoderWorker.js',
		'2.0/DecoderWorker': './src/modules/loader/2.0/DecoderWorker.js',
		'2.0/DecoderWorker_brotli': './src/modules/loader/2.0/DecoderWorker_brotli.js',
	},
	output: {
		path: path.resolve(__dirname, 'example/workers'),
		filename: '[name].js',
		clean: false, // Don't clean the directory since we might have other workers
	},
	optimization: {
		minimize: false,
	},
	target: 'webworker',
	devtool: false,
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
		],
	},
	resolve: {
		extensions: ['.js'],
	},
};

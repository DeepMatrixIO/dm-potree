import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import {fileURLToPath} from "node:url";
export default [
	{
		input: 'src/Potree.js',
		treeshake: false,
		output: {
			file: 'build/potree/potree.js',
			format: 'umd',
			name: 'Potree',
			sourcemap: true,

		},

	},
	{
		input: 'src/Potree.js',
		treeshake: false,
		output: {
			file: 'build/potree/potree_min.js',
			format: 'umd',
			name: 'Potree',
			sourcemap: true,

		},
		plugins: [

			commonjs(), // Convert CommonJS modules to ES6
			terser() // Minify the bundle
		],

	},

	{//ES version. All Threejs and other libs are merged
		input: 'src/Potree.js',
		treeshake: false,
		output: {
			file: 'build/potree/potree_full_es.js',
			format: 'es',
			name: 'Potree',
			sourcemap: true,

		}



	},


	{//threejs libraries are tried to be externalized
		input: 'src/Potree.js',
		treeshake: true,
		output: {
			file: 'build/potree/potree_es.js',
			format: 'es',
			name: 'Potree',
			sourcemap: true,
			globals: {
				three: 'THREE'
			},
			globals: {
				proj4: 'proj4'
			},

		},
		external: [
			fileURLToPath(
				new URL(
					'./libs/three.js/build/three.module.js',
					import.meta.url
				)
			),
			fileURLToPath(
				new URL(
					'../../../libs/three.js/build/three.module.js',
					import.meta.url
				)
			),
			fileURLToPath(
				new URL(
					'../libs/three.js/build/three.module.js',
					import.meta.url
				)
			),

			fileURLToPath(
				new URL(
					'../../libs/three.js/build/three.module.js',
					import.meta.url
				)
			),

			fileURLToPath(
				new URL(
					'three.module.js',
					import.meta.url
				)
			),
			fileURLToPath(
				new URL(
					'../build/three.module.js',
					import.meta.url
				)
			),
			'three'
			,
			'proj4'



			//,some other libs like tween.js
		],
		plugins: [
			nodeResolve(),
			commonjs()] // Convert CommonJS modules to ES6

	}
	,
	{
		input: 'src/workers/BinaryDecoderWorker.js',
		output: {
			file: 'build/potree/workers/BinaryDecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	}, {
		input: 'src/modules/loader/2.0/DecoderWorker.js',
		output: {
			file: 'build/potree/workers/2.0/DecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	}, {
		input: 'src/modules/loader/2.0/DecoderWorker_brotli.js',
		output: {
			file: 'build/potree/workers/2.0/DecoderWorker_brotli.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	}
]
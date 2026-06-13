import inject from '@rollup/plugin-inject';
import classFields from 'acorn-class-fields';
import staticClassFeatures from 'acorn-static-class-features';

export default [
	{
		input: 'src/Potree.js',
		treeshake: false,
		acornInjectPlugins: [classFields, staticClassFeatures],
		output: [
			{
				file: 'build/potree/potree.js',
				format: 'umd',
				name: 'Potree',
				sourcemap: true,
				globals: {
					three: 'THREE',
					jquery: '$',
					proj4: 'proj4',
					d3: 'd3',
					'@tweenjs/tween.js': 'TWEEN'
				},
				paths: (id) => {
					if (id.includes('three.module.js')) {
						return 'three';
					}
					return id;
				}
			},
			{
				file: 'build/potree/potree.module.js',
				format: 'es',
				sourcemap: true,
				paths: (id) => {
					if (id.includes('three.module.js')) {
						return 'three';
					}
					return id;
				}
			}
		],
		external: (id) => {
			if (id.includes('three.module.js')) {
				return true;
			}
			return ['three', 'jquery', 'proj4', 'd3', '@tweenjs/tween.js'].includes(id);
		},
		plugins: [
			inject({
				$: 'jquery',
				jQuery: 'jquery',
				proj4: 'proj4',
				d3: 'd3',
				TWEEN: ['@tweenjs/tween.js', '*'],
			})
		]
	},{
		input: 'src/workers/BinaryDecoderWorker.js',
		output: {
			file: 'build/potree/workers/BinaryDecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	},{
		input: 'src/modules/loader/2.0/DecoderWorker.js',
		output: {
			file: 'build/potree/workers/2.0/DecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	},{
		input: 'src/modules/loader/2.0/DecoderWorker_brotli.js',
		output: {
			file: 'build/potree/workers/2.0/DecoderWorker_brotli.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	}
]
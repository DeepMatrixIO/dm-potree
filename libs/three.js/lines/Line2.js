import {LineGeometry} from '../lines/LineGeometry.js';
import {LineMaterial} from '../lines/LineMaterial.js';
import {LineSegments2} from '../lines/LineSegments2.js';


class Line2 extends LineSegments2 {

	constructor(geometry, material) {

		if (geometry === undefined) geometry = new LineGeometry();
		if (material === undefined) material = new LineMaterial({color: Math.random() * 0xffffff});

		super(geometry, material);

		this.type = 'Line2';

		this.isLine2 = true;

	}

}



export {Line2};


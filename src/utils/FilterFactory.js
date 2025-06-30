import {FilterOperationType} from "./FilterConsts";


export class FilterFactory {


	static createAllFilter() {
		return new Filter(
			[],
			[],
			[],
			[],
			FilterOperationType.ALL
		);
	}


	static createNotFilter() {
		return new Filter(
			[],
			[],
			[],
			[],
			FilterOperationType.NOT
		);
	}

	// static createAttributeFilter(attributeList, filterList, integer_filter_values, float_filter_values, operator) {
	// 	return new Filter(
	// 		attributeList,
	// 		filterList,
	// 		integer_filter_values,
	// 		float_filter_values,
	// 		operator
	// 	);
	// }



}
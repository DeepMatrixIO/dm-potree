//Initial proposal for filtering points at shader level.
//contains all the requires methods

import {FilterConstListType, FilterIntType, FilterOperationType} from "./FilterConsts";


//import {a} from '@react-spring/web';





//each filter implements its own logic, for integer of float attributes selection, the last attribute indicates details always.
//Single filter
export class PointCloudFilter {
	_intType = FilterIntType.LOGICAL;//

	constructor(
		operator = FilterOperationType.STOP,
		//filter = [],

		index1 = 0, //attr index
		index2 = 0, // attr or constant index
		index3 = -1, //optional constant index for dual value operations  or -1
		list_type = 0, //0 integer list by default, 1 float

		attributeList = [],
		integer_filter_values = [],
		float_filter_values = [],



	) {

		//this.enabled = true; //filter is enabled by default
		this.visible = true; // to make it compatible with checkups
		this.initialized = true; // always initialized
		this.enabled = this.visible; //same value as visible

		this.attributeList = attributeList;
		this.filterList = []; //filter is a single array with all the values
		this.integer_filter_values = integer_filter_values;
		this.float_filter_values = float_filter_values;

		// let operator=filter[0]; //first item is the operator, if not provided, it is set to ALL

		if (operator === FilterOperationType.STOP	) {


					this.filterList.push([
						operator,
						-1,
						-1,
						-1,
						1])
		return;
		}


		if (
			integer_filter_values.length === 0 &&
			float_filter_values.length === 0 &&
			attributeList.length === 0
			// operator !== FilterOperationType.ALL &&
			// operator !== FilterOperationType.NOT
		) {
			// throw new Error(
			// 	'PCSelectionFilter: At least one integer or float value is required for the filter.'
			// );
			// this._intType = FilterIntType.NONE; //
			return;
		}

		if (
			operator === FilterOperationType.EQUALS_CONST ||
			operator === FilterOperationType.LESS_CONST ||
			operator === FilterOperationType.LEQ_CONST ||
			operator === FilterOperationType.GREATER_CONST ||
			operator === FilterOperationType.GREATEREQ_CONST ||

			operator === FilterOperationType.DISTINCT_ATTR ||
			operator === FilterOperationType.DISTINCT_CONST

		) {
			//  if(integer_filter_values.length === 0 && float_filter_values.length > 0){
			//     optNumber = FilterConstListType.FLOAT_LIST; //if no integer values are provided, use float values
			//   }
			//   if(integer_filter_values.length > 0 && float_filter_values.length === 0){
			//     optNumber = FilterConstListType.INTEGER_LIST; //if no integer values are provided, use float values
			//   }

			this.attributeList = attributeList; //requires at least one attribute
			if (index1 < attributeList.length) {
				let attrIndex = index1;
				let constIndex = index2;
				let optNumber = index3; //optional constant index for dual value operations, -1 if not used
				if (
					list_type == FilterConstListType.INTEGER_LIST &&
					integer_filter_values.length > 0 &&
					index2 < integer_filter_values.length
				) {
					list_type = 0;
					this.filterList.push([
						operator,
						attrIndex,
						constIndex,
						optNumber,
						list_type,
					]); //integer value list
				}

				if (
					list_type == FilterConstListType.FLOAT_LIST &&
					float_filter_values.length > 0 &&
					//integer_filter_values.length === 0 &&
					index2 < float_filter_values.length
				) {
					//use float values
					list_type = 1;
					this.filterList.push([
						operator,
						attrIndex,
						constIndex,
						optNumber,
						list_type,
					]); //flat value list
				}
				return;
			}
		}
		//atr vs atr
		if (
			operator === FilterOperationType.EQUALS_ATTR ||
			operator === FilterOperationType.LESS_ATTR ||
			operator === FilterOperationType.LEQ_ATTR ||
			operator === FilterOperationType.GREATER_ATTR ||
			operator === FilterOperationType.GREATEREQ_ATTR
		) {
			if (
				attributeList.length < 2 ||
				index1 === index2 ||
				index1 >= attributeList.length ||
				index2 >= attributeList.length
			) {
				throw new Error(
					'PCSelectionFilter: At least two attributes are required for attribute vs attribute operations and within valid index range.'
				);
			}
			this.attributeList = attributeList; //two items required as same attribute operator is not valid

			this.filterList.push([operator, index1, index2, -1, list_type]); //list type is set to 0 for integer list or 1 for float list
			return;
		}

		if (operator === FilterOperationType.IN ||
			operator === FilterOperationType.OUT

		) {
			//optnumber and other indices are not used for IN and NOT operations, so they are set to -1

			//the actual comparison depends in the existence of integer or float values, so we check if at least one is provided

			this.attributeList = attributeList;

			let attIndex = index1; //attribute index
			let startIndex = index2; //start index of the list
			let endIndex = index3; //start index of the list

			// if(integer_filter_values.length === 0 && float_filter_values.length > 0){
			//   list_type = FilterConstListType.FLOAT_LIST; //if no integer values are provided, use float values
			// }else if(integer_filter_values.length > 0 && float_filter_values.length === 0){
			//   list_type = FilterConstListType.INTEGER_LIST; //if no integer values are provided, use float values
			// }

			this.filterList.push([
				operator,
				attIndex,
				startIndex,
				endIndex,
				list_type,
			]);
			this.integer_filter_values = integer_filter_values;
			this.float_filter_values = float_filter_values;
		}

		// range operations are applied on float values only, so index1 and index2 are indices of the float_filter_values array
		//
		if (
			operator === FilterOperationType.RANGE_INCINC ||
			operator === FilterOperationType.RANGE_EXINC ||
			operator === FilterOperationType.RANGE_INCEX ||
			operator === FilterOperationType.RANGE_EXEX ||

			operator === FilterOperationType.OUTSIDE_RANGE_INCINC ||
			operator === FilterOperationType.OUTSIDE_RANGE_EXINC ||
			operator === FilterOperationType.OUTSIDE_RANGE_INCEX ||
			operator === FilterOperationType.OUTSIDE_RANGE_EXEX


		) {
			if (
				attributeList.length < 1 ||
				index1 >= attributeList.length
				// || index2 >= float_filter_values.length ||        index3 >= float_filter_values.length
			) {
				throw new Error(
					'PCSelectionFilter: At least one attribute is required for range operations and within valid index range. Index out of range.'
				);
			}
			this.attributeList = attributeList; //one item required as range operation
			let attributeIdx = index1;
			let minRangeIdx = index2;
			let maxRangeIdx = index3;
			this.filterList.push([
				operator,
				attributeIdx,
				minRangeIdx,
				maxRangeIdx,
				list_type,
			]); //list type is set to 0 for integer list or 1 for float list

			return;
		}
	}


	getIntType() {
		return this._intType;
	}

	setIntType(value) {
		this._intType = value;
		if (value !== FilterIntType.LOGICAL) {
			throw new Error(
				'PCSelectionFilter: Only LOGICAL filter type is supported for point cloud filters.'
			);
		}
	}

	set enabled(value) {
		this.visible = value; //used to enable or disable the filter. Used by 3d Objects
	}

	get enabled() {
		return this.visible; //used to enable or disable the filter. Used by 3d Objects
	}


	toString() {
		return `PCSelectionFilter: ${this.attributeList.join(
			', '
		)} | ${this.filterList
			.map(
				(f) =>
					`(${this.attributeList[f[1]]}  ${FilterOperationType[f[0]]} ${f[2] + '=>' + this.integer_filter_values[f[2]]
					}, ${f[3] == 0 ? 'INTEGER LIST' : 'FLOAT LIST'})`
			)
			.join(', ')} INT[${this.integer_filter_values}] FLOAT[${this.float_filter_values
			}]`;
	}


	//evaluated the current filter in js . A set of fiters is logically applied and push into a stack so it can be evaluated.
	//point contains all the information required to evaluate the filter, such as attributes and values.

	eval(point) {
		let results = [];
		let lastOperations = []; //default operation is AND, as this is a selection filter

		for (const filter of this.filterList) {
			let currentResult = true;
			const operation = filter[0];
			const attrIndex = filter[1];
			const constIndex = filter[2];
			const optNumber = filter[3]; //optional constant index for dual value operations, -1 if not used
			const listType = filter[4]; //0 integer list, 1 float list

			let attributeValue = point[this.attributeList[attrIndex]];
			let attributeValue2 = null;
			let constantValue = 0;

			let constantValue2 = 0; //used for range operations
			if (listType === FilterConstListType.INTEGER_LIST) {
				constantValue = this.integer_filter_values[constIndex];
			} else if (listType === FilterConstListType.FLOAT_LIST) {
				constantValue = this.float_filter_values[constIndex];
			}
			//evaluate the filter operation
			let res = false;

			switch (operation) {
				//first attribute is always retrieved
				case FilterOperationType.EQUALS_CONST:
					res = attributeValue === constantValue;
					results.push(res);

					break;
				case FilterOperationType.EQUALS_ATTR:
					attributeValue2 = point[this.attributeList[constIndex]]; //uses the second filter index
					res = attributeValue === attributeValue2;
					results.push(res);
					break;
				case FilterOperationType.LESS_CONST:
					res = attributeValue < constantValue;
					results.push(res);

					break;
				case FilterOperationType.LESS_ATTR:
					attributeValue2 = point[this.attributeList[constIndex]]; //uses the second filter index
					res = attributeValue < attributeValue2;
					results.push(res);

					break;
				case FilterOperationType.LEQ_CONST:
					res = attributeValue <= constantValue;
					results.push(res);
					break;
				case FilterOperationType.LEQ_ATTR:
					attributeValue2 = point[this.attributeList[constIndex]]; //uses the second filter index
					res = attributeValue <= attributeValue2;
					results.push(res);
					break;

				case FilterOperationType.GREATER_CONST:
					res = attributeValue > constantValue;
					results.push(res);
					break;
				case FilterOperationType.GREATER_ATTR:
					attributeValue2 = point[this.attributeList[constIndex]]; //uses the second filter index
					res = attributeValue > attributeValue2;
					results.push(res);
					break;
				case FilterOperationType.GREATEREQ_CONST:
					res = attributeValue >= constantValue;
					results.push(res);
					break;
				case FilterOperationType.GREATEREQ_ATTR:
					attributeValue2 = point[this.attributeList[constIndex]]; //uses the second filter index
					res = attributeValue >= attributeValue2;
					results.push(res);
					break;

				//range operations
				case FilterOperationType.RANGE_INCINC:

					if (listType === FilterConstListType.INTEGER_LIST) {
						constantValue = this.integer_filter_values[constIndex];
						constantValue2 = this.integer_filter_values[optNumber]; //get the second constant value
					} else if (listType === FilterConstListType.FLOAT_LIST) {
						constantValue = this.float_filter_values[constIndex];
						constantValue2 = this.float_filter_values[optNumber]; //get the second constant value
					}


					res =
						constantValue <= attributeValue && attributeValue <= constantValue2;
					results.push(res);
					break;

				case FilterOperationType.RANGE_EXINC:
					constantValue2 = this.float_filter_values[optNumber]; //get the second constant value
					res =
						constantValue < attributeValue && attributeValue <= constantValue2;
					results.push(res);
					break;

				case FilterOperationType.RANGE_INCEX:
					constantValue2 = this.float_filter_values[optNumber]; //get the second constant value
					res =
						constantValue < attributeValue && attributeValue <= constantValue2;
					results.push(res);
					break;

				case FilterOperationType.RANGE_EXEX:
					constantValue2 = this.float_filter_values[optNumber]; //get the second constant value
					res =
						constantValue < attributeValue && attributeValue < constantValue2;
					results.push(res);
					break;

				//list operations
				case FilterOperationType.IN:
					res = false;

					if (listType === FilterConstListType.INTEGER_LIST) {
						//res= this.integer_filter_values.slice(optNumber, constIndex).includes(attributeValue);
						res = this.integer_filter_values
							.slice(constIndex, optNumber + 1)
							.includes(attributeValue);
					}
					if (listType === FilterConstListType.FLOAT_LIST) {
						//res= this.float_filter_values.slice(optNumber, constIndex).includes(attributeValue);
						res = this.float_filter_values
							.slice(constIndex, optNumber + 1)
							.includes(attributeValue);
					}

					results.push(res);
			}
			//this is a stub, as each filter should implement its own evaluation logic
			//for now, we just return true, as this is a selection filter
		}

		//need something to return, fix it later
		if (results.length === 0) {
			return true; //if no filters are supplied, means all so return true
		} else {
			return results[0];
		}
	}

}





// Takes a set to filters and mix them into a flattened version, so it can be serialized and sent to the GPU

export class PointCloudFilterList {

	filters = [];

	constructor() {
		this.filters = [];
	}

	addFilter(filter) {
		this.filters.push(filter);
	}

	//for debugging purposes, returns a string representation of the filter list
	toString() {
		return `PCSelectionFilterList: ${this.filters
			.map((f) => f.toString())
			.join(' | ')}`;
	}

	//merges all filters within a list into single array, or better, into a single huge filter
	flatten() {


		// int offsetAttribute = 0; //offset for attribute indices, used to update indices when merging multiple filters
		let offsetInteger = 0; //offset for integer values, used to update indices when merging multiple filters
		let offsetFloat = 0; //offset for float values, used to update indices when merging multiple filters



		let attributeList = [];
		let filterList = []; //filter operations are index dependant and as such, values are offsetted
		let integer_filter_values = [];
		let float_filter_values = [];


		for (const filter of this.filters) {
			attributeList.push(...filter.attributeList);

			for (const filt of filter.filterList) {
				//apply offsets to indices
				let attrIndex = filt[1]; //does not require offset
				let constIndex = filt[2];//requires offset
				let optNumber = filt[3];//requires offset
				let listType = filt[4]; //does not require offset

				let currOffset = 0;
				if (listType === FilterConstListType.INTEGER_LIST) {
					constIndex += offsetInteger;
					optNumber += offsetInteger;
					offsetInteger += filter.integer_filter_values.length;
				} else if (listType === FilterConstListType.FLOAT_LIST) {
					constIndex += offsetFloat;
					optNumber += offsetFloat;
					offsetFloat += filter.float_filter_values.length;
				}


				filterList = filterList.concat([
					filt[0],
					attrIndex,
					constIndex,
					optNumber,
					listType,
				]);
				// this.offsetAttribute += filter.attributeList.length;
				// this.offsetInteger += filter.integer_filter_values.length;
				// this.offsetFloat += filter.float_filter_values.length;
			} //this is where indices should be updated and offset applied
			//pointCloudFilter.filterList.push(...filter.filterList);//this is where indices should be updated and offset applied

			integer_filter_values.push(
				...filter.integer_filter_values
			);
			float_filter_values.push(...filter.float_filter_values);
		}

		return {
			attributeList: attributeList,
			filterList: filterList,
			integer_filter_values: integer_filter_values,
			float_filter_values: float_filter_values,
		};

		// return pointCloudFilter;
	}
}

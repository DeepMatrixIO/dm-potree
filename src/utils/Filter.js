//Initial proposal for filtering points at shader level.
//contains all the requires methods
//in particular, each filter contains a code to enablie disable visibility based on a commited list of classes ASPRS classification like.
// to allow visibility of a particular class,

import {FilterConstListType, FilterIntType, FilterOperationType} from "./FilterConsts";


//import {a} from '@react-spring/web';





//each filter implements its own logic, for integer of float attributes selection, the last attribute indicates details always.
//Single filter
//example,
export class PointCloudFilter {
	_intType = FilterIntType.LOGICAL;//
	_groupId = 0;

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


	 // used to group volumes, e.g. for filtering
		this.operator = operator; //filter operation type, default is STOP
		this.name = this.getFilterName(); //filter operation type, default is STOP
		//this.enabled = true; //filter is enabled by default
		this.visible = true; // to make it compatible with checkups
		this.initialized = true; // always initialized
		this.enabled = this.visible; //same value as visible

		this.attributeList = attributeList;
		this.filterList = []; //filter is a single array with all the values
		this.integer_filter_values = integer_filter_values;
		this.float_filter_values = float_filter_values;

		// let operator=filter[0]; //first item is the operator, if not provided, it is set to ALL

		if (operator === FilterOperationType.STOP) {


			this.filterList.push([
				operator,
				-1,
				-1,
				-1,
				1])
			this.name = "STOP";
			return;
		}
		if (operator === FilterOperationType.COLORIZE) {
			//colorize is tied to agiven list of classes and visiblity.

			this.filterList.push([
				operator,
				// -1,
				index1,
				0,
				-1,
				1])
			this.name = "COLORIZE";
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

				//integer list may be deprecated
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

	get groupId() {
		return this._groupId;
	}
	set groupId(value) {
			this._groupId = value;
	}


	getFilterName() {


		if (this.operator === FilterOperationType.EQUALS_CONST) {
			return "EQUALS_CONST";
		}
		if (this.operator === FilterOperationType.EQUALS_ATTR) {
			return "EQUALS_ATTR";
		}
		if (this.operator === FilterOperationType.LESS_CONST) {
			return "LESS_CONST";
		}
		if (this.operator === FilterOperationType.LESS_ATTR) {
			return "LESS_ATTR";
		}
		if (this.operator === FilterOperationType.LEQ_CONST) {
			return "LEQ_CONST";
		}
		if (this.operator === FilterOperationType.LEQ_ATTR) {
			return "LEQ_ATTR";
		}
		if (this.operator === FilterOperationType.GREATER_CONST) {
			return "GREATER_CONST";
		}
		if (this.operator === FilterOperationType.GREATER_ATTR) {
			return "GREATER_ATTR";
		}
		if (this.operator === FilterOperationType.GREATEREQ_CONST) {
			return "GREATEREQ_CONST";
		}
		if (this.operator === FilterOperationType.GREATEREQ_ATTR) {
			return "GREATEREQ_ATTR";
		}
		if (this.operator === FilterOperationType.RANGE_INCINC) {
			return "RANGE_INCINC";
		}
		if (this.operator === FilterOperationType.RANGE_EXINC) {
			return "RANGE_EXINC";
		}
		if (this.operator === FilterOperationType.RANGE_INCEX) {
			return "RANGE_INCEX";
		}
		if (this.operator === FilterOperationType.RANGE_EXEX) {
			return "RANGE_EXEX";
		}
		if (this.operator === FilterOperationType.IN) {
			return "IN";
		}
		if (this.operator === FilterOperationType.OUT) {
			return "OUT";
		}
		if (this.operator === FilterOperationType.DISTINCT_CONST) {
			return "DISTINCT_CONST";
		}
		if (this.operator === FilterOperationType.DISTINCT_ATTR) {
			return "DISTINCT_ATTR";
		}
		if (this.operator === FilterOperationType.OUTSIDE_RANGE_INCINC) {
			return "OUTSIDE_RANGE_INCINC";
		}
		if (this.operator === FilterOperationType.OUTSIDE_RANGE_EXINC) {
			return "OUTSIDE_RANGE_EXINC";
		}
		if (this.operator === FilterOperationType.OUTSIDE_RANGE_INCEX) {
			return "OUTSIDE_RANGE_INCEX";
		}
		if (this.operator === FilterOperationType.OUTSIDE_RANGE_EXEX) {
			return "OUTSIDE_RANGE_EXEX";
		}
		if (this.operator === FilterOperationType.AND) {
			return "AND";
		}
		if (this.operator === FilterOperationType.OR) {
			return "OR";
		}
		if (this.operator === FilterOperationType.NOT) {
			return "NOT";
		}
		if (this.operator === FilterOperationType.XOR) {
			return "XOR";
		}
		if (this.operator === FilterOperationType.COLORIZE) {
			return "COLORIZE";
		}
		if (this.operator === FilterOperationType.STOP) {
			return "STOP";
		}
		if (this.operator === FilterOperationType.ALL) {
			return "ALL";
		}
		return "UNKNOWN";




	}


	get intType() {
		return this._intType;
	}

	set intType(value) {
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


	toJSON() {
		return {
			name: this.name,
			intType: this._intType,
			attributeList: this.attributeList,
			filterList: this.filterList,
			integer_filter_values: this.integer_filter_values,
			float_filter_values: this.float_filter_values,
			visible: this.visible,
			initialized: this.initialized,
			enabled: this.enabled,
			groupId: this.groupId
		};
	}

	static fromJSON(data) {
		let filter = new PointCloudFilter(

			data.filterList[0][0],//operator
			data.filterList[0][1],//index1
			data.filterList[0][2],//index2
			data.filterList[0][3],//index3
			data.filterList[0][4],//list type
			data.attributeList,//array of attributes
			data.integer_filter_values,//data values
			data.float_filter_values//data values
		);
		filter.name = data.name;
		filter._intType = data.intType;
		filter.visible = data.visible;
		filter.initialized = data.initialized;
		filter.enabled = data.enabled;
		filter.groupId = data.groupId || 0; //default to 0 if not provided
		return filter;
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



		let attributeList = [];//is being reordered to avoid duplicates and indices changed accordingly
		let filterList = []; //filter operations are index dependant and as such, values are offsetted
		let integer_filter_values = [];
		let float_filter_values = [];

		let attributeMap = new Map(); //used to avoid duplicates in the attribute list and update indices accordingly
		//maps attribute to index in the attributeList
		//if attributes appear on different order somewhere else, as the map exists, existing index values will be replaced with the new ones,


		for (const filter of this.filters) {

			//flattening and applying offset on attribute Index
			filter.attributeList.forEach((attr, index) => {
				if (!attributeMap.has(attr)) {//add it

					if (attr == "z" || attr == "Z") {
						attributeMap.set(attr, -3);//negative index is used for xyz

					} else
						if (attr == "x" || attr == "X") {
							attributeMap.set(attr, -1);
						} else
							if (attr == "y" || attr == "Y") {
								attributeMap.set(attr, -2);

							}
							//other attributes can be used as well, but only return_number and number of returns seem useful

							else {

								attributeMap.set(attr, attributeList.length + index);

							}
					attributeList.push(attr);
				}
				//else {
				//update the index in the filter
				let attrIndex = attributeMap.get(attr);
				filter.filterList.forEach(filt => {
					if (filt[1] === index) {
						filt[1] = attrIndex; //update the index in the filter
					}
				});
				//}
			});

			// console.log('AttributeList', attributeList);


			for (const filt of filter.filterList) {
				//apply offsets to indices
				let attrIndex = filt[1]; //offset is applied earlier
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

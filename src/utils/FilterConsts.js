export class FilterIntType {
	// static STOP = 0; //no filter
	static BOXVOLUME = 1; //volume filter
	// static SphereVolume = 2; //sphere filter
	// static CylinderVolume = 3; //cylinder filter
	static POLYGONVOLUME = 4; //polygon filter
	static POLYGON = 5; //polygon filter

	static LOGICAL= 10; //point cloud volume filter, i.e. a point cloud is used as a filter
	static NONE = 255; //no filter
}

export class FilterConstListType {

	static INTEGER_LIST = 0;
	static FLOAT_LIST = 1;
}

//THE REAL ISSUE IS HOW TO ENCODE LOGIC OPERATIONS BETWEEN FILTERS TO BE APPLICABLE TO A POINTCLOUD
export class FilterOperationType {


	static EQUALS_CONST = 0; //TESTED OK
	static EQUALS_ATTR = 1;

	static LESS_CONST = 2; //TESTED OK
	static LESS_ATTR = 3;
	static LEQ_CONST = 4; //TESTED OK
	static LEQ_ATTR = 5;
	static GREATER_CONST = 6; //TESTED OK
	static GREATER_ATTR = 7;
	static GREATEREQ_CONST = 8; //TESTED OK
	static GREATEREQ_ATTR = 9;

	static RANGE_INCINC = 10;//  between //TESTED OK
	static RANGE_EXINC = 11;// TESTED OK
	static RANGE_INCEX = 12;// TESTED OK
	static RANGE_EXEX = 13;// TESTED OK

	static IN = 14;//list of discrete values // TESTED OK
	static OUT = 15;// outside of a list of discrete values // TESTED OK

	static DISTINCT_CONST = 16;//distinct values than a constant // TESTED OK
	static DISTINCT_ATTR = 17;//distinct values than an attribute

	static OUTSIDE_RANGE_INCINC = 18;//outside of a range, exclusive  EQUALS TO NOT 10, EXCLUDING VALUES // TESTED OK
	static OUTSIDE_RANGE_EXINC = 19;//outside of a range, clusive exclusive, EQUALS NOT 11, INCLUDING LOWER VALUE, EXCLUDING HIGHER VALUE // TESTED OK
	static OUTSIDE_RANGE_INCEX = 20;//outside of a range, excluding lower value and  including higher value // TESTED OK
	static OUTSIDE_RANGE_EXEX = 21;//outside of a range, INCLUDING BITH LOWER AND HIGHER VALUES, EQUALS NOT 13 // TESTED OK

	static AND = 22;//logical AND operation between two filters // TODO  but is default behaviour for filtering
	static OR = 23;//logical OR operation between two filters  // TODO  Means to signal  an OR operation with the next result
	static NOT = 24;//logical NOT operation on a filter  // TODO
	static XOR = 25;//logical XOR operation between two filters  // TODO

	static STOP = 254;
	static ALL = 255;
}
export class FilterIntType {
	static STOP = 0; //no filter
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


	static EQUALS_CONST = 0;
	static EQUALS_ATTR = 1;

	static LESS_CONST = 2;
	static LESS_ATTR = 3;
	static LEQ_CONST = 4;
	static LEQ_ATTR = 5;
	static GREATER_CONST = 6;
	static GREATER_ATTR = 7;
	static GREATEREQ_CONST = 8;
	static GREATEREQ_ATTR = 9;

	static RANGE_INCINC = 10;//  between
	static RANGE_EXINC = 11;//
	static RANGE_INCEX = 12;
	static RANGE_EXEX = 13;

	static IN = 14;//list of discrete values
	static NOT_IN = 15;// outside of a list of discrete values

	static DISTINCT_CONST = 16;//distinct values than a constant
	static DISTINCT_ATTR = 17;//distinct values than an attribute

	static OUTSIDE_RANGE_INCINC = 18;//outside of a range, exclusive  EQUALS TO NOT 10, EXCLUDING VALUES
	static OUTSIDE_RANGE_EXINC = 19;//outside of a range, clusive exclusive, EQUALS NOT 11, INCLUDING LOWER VALUE, EXCLUDING HIGHER VALUE
	static OUTSIDE_RANGE_INCEX = 20;//outside of a range, excluding lower value and  including higher value
	static OUTSIDE_RANGE_EXEX = 21;//outside of a range, INCLUDING BITH LOWER AND HIGHER VALUES, EQUALS NOT 13

	static AND = 22;//logical AND operation between two filters
	static OR = 23;//logical OR operation between two filters
	static NOT = 24;//logical NOT operation on a filter
	static XOR = 25;//logical XOR operation between two filters

	static NONE = 254;
	static ALL = 255;
}
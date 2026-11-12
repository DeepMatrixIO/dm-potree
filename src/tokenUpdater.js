import {XHRFactory} from "./XHRFactory";
function updateFetchToken(fetchOptions) {

	// window.Potree.XHRFactory.config.customHeaders.forEach(function (header) {//added by jguerrer
	XHRFactory.config.customHeaders.forEach(function (header) {//added by jguerrer
		fetchOptions.headers[header.header] = header.value;
	});
	return fetchOptions;
}
// Add this function:
function setPotreeAuthToken(token) {
	if (!token) return;
	XHRFactory.config.customHeaders = [
		{header: 'Authorization', value: `Bearer ${token}`}
	];
}
export {updateFetchToken, setPotreeAuthToken};
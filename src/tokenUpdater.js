import { XHRFactory } from "./XHRFactory";
function updateFetchToken(fetchOptions) {

	// window.Potree.XHRFactory.config.customHeaders.forEach(function (header) {//added by jguerrer
	XHRFactory.config.customHeaders.forEach(function (header) {//added by jguerrer
		fetchOptions.headers[header.header] = header.value;
	});
	return fetchOptions;
}

export {updateFetchToken};

async function loadJSONFromFile(filePath) {
	try {
		const response = await fetch(filePath);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const jsonData = await response.json();
		return jsonData;
	} catch (error) {
		console.error('Error loading JSON:', error);
		throw error;
	}
}

// Usage
async function loadState(path) {
	try {
		let lastState="./persistedFilters/savedState.json";
		const state = await loadJSONFromFile(path);
		console.log('Loaded state:', state);
		return state;
	} catch (error) {
		console.error('Failed to load state:', error);
	}
}

function loadJSONSync(filePath) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', filePath, false); // false = synchronous
    xhr.send();

    if (xhr.status === 200) {
        return JSON.parse(xhr.responseText);
    } else {
        throw new Error(`Failed to load JSON: ${xhr.status}`);
    }
}

export class Message{

	constructor(content){
		this.content = content;

		let closeIcon = `${exports.resourcePath}/icons/close.svg`;

		const temp = document.createElement("div");
		temp.innerHTML = `
			<div class="potree_message">
				<span name="content_container" style="flex-grow: 1; padding: 5px"></span>
				<img name="close" src="${closeIcon}" class="button-icon" style="width: 16px; height: 16px;">
			</div>`.trim();
		this.element = temp.firstChild;

		this.elClose = this.element.querySelector("img[name=close]");

		this.elContainer = this.element.querySelector("span[name=content_container]");

		if(typeof content === "string"){
			const span = document.createElement("span");
			span.textContent = content;
			this.elContainer.appendChild(span);
		}else{
			if (content instanceof HTMLElement) {
				this.elContainer.appendChild(content);
			} else if (content && typeof content.get === "function") {
				this.elContainer.appendChild(content.get(0));
			} else if (content) {
				this.elContainer.appendChild(content);
			}
		}

	}

	setMessage(content){
		this.elContainer.innerHTML = "";
		if(typeof content === "string"){
			const span = document.createElement("span");
			span.textContent = content;
			this.elContainer.appendChild(span);
		}else{
			if (content instanceof HTMLElement) {
				this.elContainer.appendChild(content);
			} else if (content && typeof content.get === "function") {
				this.elContainer.appendChild(content.get(0));
			} else if (content) {
				this.elContainer.appendChild(content);
			}
		}
	}

}
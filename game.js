(() => {
	"use strict";

	const state = {
		sol: 1,
		power: 100,
		oxygen: 100,
		health: 100,
		currentEventIndex: 0,
		events: [],
		gameOver: false,
		loading: true
	};

	const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));

	function findElement(selectors) {
		for (const selector of selectors) {
			const element = document.querySelector(selector);
			if (element) return element;
		}
		return null;
	}

	function setBar(selectors, value, kind) {
		const bar = findElement(selectors);
		if (!bar) return;
		const amount = clamp(value);
		bar.style.width = `${amount}%`;
		bar.setAttribute("aria-valuenow", String(amount));
		bar.setAttribute("aria-valuemin", "0");
		bar.setAttribute("aria-valuemax", "100");
		bar.setAttribute("role", "progressbar");
		bar.classList.remove("bg-success", "bg-warning", "bg-danger", "low", "medium", "high");
		const level = amount <= 25 ? "low" : amount <= 60 ? "medium" : "high";
		bar.classList.add(level);
		if (bar.classList.contains("progress-bar")) {
			bar.classList.add(amount <= 25 ? "bg-danger" : amount <= 60 ? "bg-warning" : "bg-success");
		} else {
			bar.style.backgroundColor = amount <= 25 ? "#dc3545" : amount <= 60 ? "#ffc107" : "#28a745";
		}
		bar.dataset.resource = kind;
	}

	function updateUI() {
		setBar(["#power-bar", "#power-fill", "[data-resource='power'] .progress-bar", "[data-power-bar]"], state.power, "power");
		setBar(["#oxygen-bar", "#oxygen-fill", "[data-resource='oxygen'] .progress-bar", "[data-oxygen-bar]"], state.oxygen, "oxygen");
		setBar(["#health-bar", "#health-fill", "[data-resource='health'] .progress-bar", "[data-health-bar]"], state.health, "health");

		const solBadge = findElement(["#sol-counter", "#sol-badge", "[data-sol-counter]"]);
		if (solBadge) solBadge.textContent = `Sol: ${state.sol}`;

		const powerText = findElement(["#power-value", "[data-power-value]"]);
		const oxygenText = findElement(["#oxygen-value", "[data-oxygen-value]"]);
		const healthText = findElement(["#health-value", "[data-health-value]"]);
		if (powerText) powerText.textContent = `${state.power}%`;
		if (oxygenText) oxygenText.textContent = `${state.oxygen}%`;
		if (healthText) healthText.textContent = `${state.health}%`;
	}

	function getDanger(event) {
		const raw = event && (event.danger ?? event.dangerLevel ?? event.level);
		const numeric = Number(raw);
		if (Number.isFinite(numeric)) return numeric;
		const match = String(raw ?? "").match(/\d+(?:\.\d+)?/);
		return match ? Number(match[0]) : 0;
	}

	function showEvent() {
		const container = findElement(["#event-alert", "#alert-container", "#event-container", ".alert-container", "[data-event-alert]"]);
		if (!container) return;
		if (!state.events.length) {
			container.textContent = state.loading ? "Loading the next mission..." : "No mission events are available.";
			return;
		}

		const event = state.events[state.currentEventIndex % state.events.length];
		const name = event.kidName ?? event.name ?? "Solar Storm Alert";
		const danger = event.danger ?? event.dangerLevel ?? event.level ?? "Unknown";
		const explanation = event.explanation ?? event.description ?? "Check the outpost systems and choose your next action.";
		const funFact = event.funFact ?? event.fun_fact ?? "Mars has dust storms that can cover a huge area.";
		container.replaceChildren();
		const heading = document.createElement("h2");
		heading.textContent = String(name);
		const dangerLine = document.createElement("p");
		dangerLine.textContent = `Danger level: ${danger}`;
		const explanationLine = document.createElement("p");
		explanationLine.textContent = String(explanation);
		const factLine = document.createElement("p");
		factLine.textContent = `Fun fact: ${funFact}`;
		container.append(heading, dangerLine, explanationLine, factLine);
	}

	function showFailure() {
		const report = findElement(["#failure-report", "#mission-report", "[data-failure-report]"]);
		const reason = state.power <= 0 ? "Power ran out" : state.oxygen <= 0 ? "Oxygen ran out" : "Health reached zero";
		const message = `${reason}. NASA astronauts and mission teams carefully balance limited power, oxygen, and safety; they prioritize life support and shelter when conditions are dangerous. Next time, save power for critical systems, use shields during severe storms, and monitor oxygen and health each Sol.`;
		if (report) {
			report.hidden = false;
			report.setAttribute("role", "alert");
			report.replaceChildren();
			const heading = document.createElement("h2");
			heading.textContent = "Why Did I Fail?";
			const details = document.createElement("p");
			details.textContent = message;
			report.append(heading, details);
		} else {
			const container = findElement(["#event-alert", "#alert-container", "#event-container", ".alert-container", "[data-event-alert]"]);
			if (container) {
				const reportHeading = document.createElement("h2");
				reportHeading.textContent = "Why Did I Fail?";
				const details = document.createElement("p");
				details.textContent = message;
				container.append(reportHeading, details);
			}
		}
		for (const button of getChoiceButtons()) button.disabled = true;
	}

	function getChoiceButtons() {
		return [
			...document.querySelectorAll("#shields-on, #shield-on, #button1, [data-action='shields-on'], [data-choice='shields-on'], .shields-on"),
			...document.querySelectorAll("#shields-off, #shield-off, #button2, [data-action='shields-off'], [data-choice='shields-off'], .shields-off")
		];
	}

	function checkFailure() {
		if (state.power <= 0 || state.oxygen <= 0 || state.health <= 0) {
			state.gameOver = true;
			updateUI();
			showFailure();
			return true;
		}
		return false;
	}

	function takeTurn(useShields) {
		if (state.gameOver || state.loading || !state.events.length) return;
		const event = state.events[state.currentEventIndex % state.events.length];
		const danger = getDanger(event);

		if (useShields) {
			state.power = clamp(state.power - 20);
		} else if (danger > 2) {
			state.health = clamp(state.health - danger * 8);
		}

		if (checkFailure()) return;
		state.power = clamp(state.power - 10);
		state.oxygen = clamp(state.oxygen - 10);
		state.sol += 1;
		state.currentEventIndex += 1;
		updateUI();
		if (checkFailure()) return;
		showEvent();
	}

	function bindButtons() {
		const onButtons = document.querySelectorAll("#shields-on, #shield-on, #button1, [data-action='shields-on'], [data-choice='shields-on'], .shields-on");
		const offButtons = document.querySelectorAll("#shields-off, #shield-off, #button2, [data-action='shields-off'], [data-choice='shields-off'], .shields-off");
		onButtons.forEach(button => button.addEventListener("click", () => takeTurn(true)));
		offButtons.forEach(button => button.addEventListener("click", () => takeTurn(false)));
	}

	async function startGame() {
		updateUI();
		showEvent();
		bindButtons();
		try {
			const response = await fetch("events.json");
			if (!response.ok) throw new Error(`Could not load events (${response.status}).`);
			const data = await response.json();
			state.events = Array.isArray(data) ? data : Array.isArray(data.events) ? data.events : [];
		} catch (error) {
			state.events = [];
			const container = findElement(["#event-alert", "#alert-container", "#event-container", ".alert-container", "[data-event-alert]"]);
			if (container) container.textContent = "Mission data could not be loaded. Please refresh to try again.";
			console.error("Solar Storm Outpost Survival: event data failed to load.", error);
		} finally {
			state.loading = false;
			showEvent();
			updateUI();
		}
	}

	window.gameState = state;
	window.updateUI = updateUI;
	window.chooseShieldsOn = () => takeTurn(true);
	window.chooseShieldsOff = () => takeTurn(false);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", startGame, { once: true });
	} else {
		startGame();
	}
})();

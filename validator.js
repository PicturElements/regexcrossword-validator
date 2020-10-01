function parsePuzzle(wrapper) {
	const puzzle = {
		wrapper,
		type: wrapper.classList.contains("puzzle-hexagonal") ?
			"hexagonal" :
			"grid",
		rows: [],
		checkers: []
	};

	switch (puzzle.type) {
		case "grid":
			return parsePuzzleGrid(puzzle, wrapper);

		case "hexagonal":
			return parsePuzzleHexagonal(puzzle, wrapper);
	}

	return puzzle;
}

function parsePuzzleGrid(puzzle, wrapper) {
	const cluesTop = wrapper.querySelectorAll("thead th + th"),
		cluesBottom = wrapper.querySelectorAll("tfoot th + th");

	puzzle.rows = [...wrapper.querySelectorAll("tbody tr")].map((row, rI, rows) => {
		const cells = [...row.querySelectorAll("td")];

		return cells.map((cell, cI) => {
			const out = {
				row,
				cell,
				cells,
				input: cell.querySelector("input"),
				clues: {
					top: null,
					bottom: null,
					left: null,
					right: null
				}
			}

			if (!rI)
				out.clues.top = cluesTop[cI] || null;
			if (rI == rows.length - 1)
				out.clues.bottom = cluesBottom[cI] || null;

			if (!cI)
				out.clues.left = cell.previousElementSibling || null;
			if (cI == cells.length - 1)
				out.clues.right = cell.nextElementSibling || null;

			return out;
		});
	});

	puzzle.checkers = constructCheckersGrid(puzzle);

	return puzzle;
}

function parsePuzzleHexagonal(puzzle, wrapper) {
	puzzle.rows = [...wrapper.querySelectorAll(".row")].map(row => {
		const cells = [...row.children];

		return cells.map(cell => ({
			row,
			cell,
			cells,
			input: cell.querySelector("input")
		}));
	});

	puzzle.checkers = constructCheckersHexagonal(puzzle);

	return puzzle;
}

function constructCheckersGrid(puzzle) {
	if (!puzzle.rows.length)
		return [];

	const checkers = [],
		rLen = puzzle.rows.length;

	// Rows
	puzzle.rows.forEach((row, rI) => {
		const cellLeft = row[0],
			clueLeft = cellLeft.clues.left,
			clueLeftValue = clueLeft && clueLeft.textContent.trim();

		if (clueLeftValue) {
			checkers.push({
				clue: clueLeft,
				value: clueLeftValue,
				regex: mkRegex(clueLeftValue),
				indices: row.map((_, cI) => [rI, cI])
			});
		}

		const cellRight = row[row.length - 1],
			clueRight = cellRight.clues.right,
			clueRightValue = clueRight && clueRight.textContent.trim();

		if (clueRightValue) {
			checkers.push({
				clue: clueRight,
				value: clueRightValue,
				regex: mkRegex(clueRightValue),
				indices: row.map((_, cI) => [rI, cI])
			});
		}
	});

	// Columns - top
	puzzle.rows[0].forEach((cell, cI) => {
		const clueTop = cell.clues.top,
			clueTopValue = clueTop && clueTop.textContent.trim();

		if (!clueTopValue)
			return;

		checkers.push({
			clue: clueTop,
			value: clueTopValue,
			regex: mkRegex(clueTopValue),
			indices: puzzle.rows.map((_, rI) => [rI, cI])
		});
	});

	// Columns - bottom
	puzzle.rows[rLen - 1].forEach((cell, cI) => {
		const clueBottom = cell.clues.bottom,
			clueBottomValue = clueBottom && clueBottom.textContent.trim();

		if (!clueBottomValue)
			return;

		checkers.push({
			clue: clueBottom,
			value: clueBottomValue,
			regex: mkRegex(clueBottomValue),
			indices: puzzle.rows.map((_, rI) => [rI, cI])
		});
	});

	return checkers;
}

function constructCheckersHexagonal(puzzle) {
	if (!puzzle.rows.length)
		return [];

	const checkers = [],
		rLen = puzzle.rows.length;

	// Rows
	puzzle.rows.forEach((row, rI) => {
		const cell = row[0].cell,
			clue = cell.querySelector(".clue-left input");

		if (!clue || !clue.value)
			return;

		checkers.push({
			clue,
			value: clue.value,
			regex: mkRegex(clue.value),
			indices: row.map((_, cI) => [rI, cI])
		});
	});

	// Top diagonals - top row
	puzzle.rows[0].forEach(({ cell }, cI) => {
		const clue = cell.querySelector(".clue-top input");

		if (!clue || !clue.value)
			return;

		checkers.push({
			clue,
			value: clue.value,
			regex: mkRegex(clue.value),
			indices: calculateTopDiagonalIndices(puzzle, 0, cI)
		});
	});

	// Top diagonals - side
	for (let rI = 1, rIMax = Math.ceil(rLen / 2); rI < rIMax; rI++) {
		const row = puzzle.rows[rI],
			cI = row.length - 1,
			clue = row[cI].cell.querySelector(".clue-top input");

		if (!clue || !clue.value)
			continue;

		checkers.push({
			clue,
			value: clue.value,
			regex: mkRegex(clue.value),
			indices: calculateTopDiagonalIndices(puzzle, rI, cI)
		});
	}

	// Bottom diagonals - bottom row
	puzzle.rows[rLen - 1].forEach(({ cell }, cI) => {
		const clue = cell.querySelector(".clue-bottom input");

		if (!clue || !clue.value)
			return;

		checkers.push({
			clue,
			value: clue.value,
			regex: mkRegex(clue.value),
			indices: calculateBottomDiagonalIndices(puzzle, rLen - 1, cI)
		});
	});

	// Bottom diagonals - side
	for (let rI = rLen - 2, rIMin = Math.floor(rLen / 2); rI >= rIMin; rI--) {
		const row = puzzle.rows[rI],
			cI = row.length - 1,
			clue = row[cI].cell.querySelector(".clue-bottom input");

		if (!clue || !clue.value)
			continue;

		checkers.push({
			clue,
			value: clue.value,
			regex: mkRegex(clue.value),
			indices: calculateBottomDiagonalIndices(puzzle, rI, cI)
		});
	}

	return checkers;
}

function calculateTopDiagonalIndices(puzzle, rowIdx, colIdx) {
	const indices = [],
		rows = puzzle.rows,
		rLen = rows.length,
		directionCutoff = Math.ceil(rLen / 2);
	let cI = colIdx;

	for (let rI = rowIdx, rIMax = rows.length; rI < rIMax; rI++) {
		if (rI >= directionCutoff)
			cI--;

		if (cI < 0)
			break;

		indices.push([
			rI,
			cI
		]);
	}

	return indices;
}

function calculateBottomDiagonalIndices(puzzle, rowIdx, colIdx) {
	const indices = [],
		rows = puzzle.rows,
		rLen = rows.length,
		directionCutoff = Math.floor(rLen / 2);
	let cI = colIdx;

	for (let rI = rowIdx; rI >= 0; rI--) {
		if (rI < directionCutoff)
			cI--;

		if (cI < 0)
			break;

		indices.push([
			rI,
			cI
		]);
	}

	return indices;
}

function mkRegex(source) {
	return new RegExp(`^${source}$`, "i");
}

function validate(puzzle) {
	for (const checker of puzzle.checkers)
		check(puzzle, checker);

	return puzzle;
}

function check(puzzle, checker) {
	let str = "",
		eligible = true;

	for (const [rI, cI] of checker.indices) {
		const char = puzzle.rows[rI][cI].input.value;

		if (!char) {
			eligible = false;
			break;
		}

		str += char;
	}

	if (eligible && !checker.regex.test(str))
		checker.clue.style = "background: #da3826; color: white; border-radius: 3px";
	else
		checker.clue.style = "";
}

function init() {
	if (window[Symbol.for("runtime")]) {
		const rt = window[Symbol.for("runtime")];

		if (rt.puzzle)
			validate(rt.puzzle);

		return;
	}

	const mountListener = _ => {
		wrapper.addEventListener("input", evt => {
			if (!evt.target.value)
				return;

			validate(puzzle);
		});

		wrapper.addEventListener("change", _ => validate(puzzle));
	};

	const mode = prompt("Choose an operating mode:\nclick - Validate when the bookmarklet is clicked\nlive - track edits and validate in real-time", "click");

	if (mode == null)
		return;

	if (mode != "live" && mode != "click")
		return alert(`Invalid operating mode '${mode}'`);

	let wrapper = document.querySelector("form.puzzle"),
		puzzle = (wrapper && parsePuzzle(wrapper)) || null,
		runtime = {
			puzzle
		};

	const observer = new MutationObserver(_ => {
		const w = document.querySelector("form.puzzle");

		if (!w || w == wrapper)
			return;

		wrapper = w;
		puzzle = parsePuzzle(w);
		runtime.puzzle = puzzle;

		if (mode == "live") {
			validate(puzzle);
			mountListener();
		}
	});

	observer.observe(document.body, {
		subtree: true,
		childList: true
	});

	if (puzzle)
		validate(puzzle);
	if (mode == "live")
		mountListener();

	window[Symbol.for("runtime")] = runtime;
}

init();

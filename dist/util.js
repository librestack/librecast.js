const util = (function () {

const convertUTF16toUTF8 = function(idx, utf16in, len, dataview) {
	var c, i;
	for (i = 0; i < len; i++) {
		c = utf16in.charCodeAt(i);
		if (c <= 0x7f) {
			dataview.setUint8(idx++, c);
		}
		else if (c <= 0x7ff) {
			dataview.setUint8(idx++, 0xc0 | (c >>> 6));
			dataview.setUint8(idx++, 0x80 | (c & 0x3f));
		}
		else if (c <= 0xffff) {
			dataview.setUint8(idx++, 0xe0 | (c >>> 12));
			dataview.setUint8(idx++, 0x80 | ((c >>> 6) & 0x3f));
			dataview.setUint8(idx++, 0x80 | (c & 0x3f));
		}
		else {
			console.log("UTF-16 surrogate pair, ignoring");
			/* TODO: 4 byte UTF-8 encoding, just in case anyone speaks Vogon */
		}
	}
	return idx;
}

/* return bytes required to 7bit encode length */
const bytes7BitLength = function(input) {
	const buffer = new ArrayBuffer(4);
	const view = new DataView(buffer, 0);
	let bytes = 1;
	view.setUint32(0, input, true);
	for (let i = 0, n = view.getUint32(0, true); n > 0x7f; n >>>=7) {
		view.setUint8(i++, 0x80 | n);
		bytes++;
	}
	return bytes;
}

const encode7BitLength = function(input) {
	const bytes = bytes7BitLength(input);
	let idx = 0, n;
	const buffer = new ArrayBuffer(bytes);
	const view = new DataView(buffer);
	view.setUint8(idx, input, true);
	for (n = view.getUint8(idx); n > 0x7f; n >>>=7) {
		view.setUint8(idx++, 0x80 | n);
	}
	view.setUint8(idx++, n);
	return buffer;
}

const bytesRequired = function(fields) {
	let bytes = 0;
	for (let i = 0; i < fields.length; i++) {
		if (fields[i] !== null) {
			bytes += bytes7BitLength(fields[i].length) + fields[i].length;
		}
	}
	return bytes;
}

const wirePack7Bit = function(fields, bytes, offset) {
	let idx = offset;
	const buffer = new ArrayBuffer(bytes);
	const uint8 = new Uint8Array(buffer);
	const view = new DataView(buffer);
	for (let i = 0; i < fields.length; i++) {
		if (fields[i] !== null) {
			let n;
			const len = fields[i].length;
			view.setUint8(idx, len);
			for (n = view.getUint8(idx); n > 0x7f; n >>>=7) {
				view.setUint8(idx++, 0x80 | n);
			}
			view.setUint8(idx++, n);
			if (typeof fields[i] === "object") {
				uint8.set(new Uint8Array(fields[i]), idx);
				idx += len;
			}
			else
				idx = convertUTF16toUTF8(idx, fields[i], len, view);
		}
	}
	return buffer;
}

const wirePackPre = function(pre, fields) {
	const offset = pre.length;
	const bytes = bytesRequired(fields) + offset;
	const buffer = wirePack7Bit(fields, bytes, offset);
	const uint8 = new Uint8Array(buffer);
	uint8.set(pre);
	return buffer;
}

const wirePack = function(opcode, flags, fields) {
	return wirePackPre([opcode, flags], fields);
}

const wireUnpack7Bit = function(buffer, offset) {
	if (offset === undefined) offset = 0;
	let fields = [];
	const view = new DataView(buffer);
	const bytes = buffer.byteLength;
	for (let i = offset, len = 0; i < bytes; i += len) {
		let n = 0, shift = 0;
		let b;
		do {
			if (i >= bytes) throw "overflow";
			b = view.getUint8(i++);
			n |= (b & 0x7f) << shift;
			shift += 7;
		} while (b & 0x80);
		len = n; /* FIXME: convert to host byte order */
		if (i + len > bytes) break; // throw "out of bounds";
		fields.push(new Uint8Array(buffer.slice(i, i + len)));
	}
	return fields;
}

const wireUnpack = function(buffer) {
	const view = new DataView(buffer);
	const opcode = view.getUint8(0);
	const flags = view.getUint8(1);
	const fields =  wireUnpack7Bit(buffer, 2);
	return [ opcode, flags, fields ];
}

const keysEqual = function(key1, key2) {
	const len1 = key1.byteLength;
	const len2 = key2.byteLength;
	if (len1 !== len2) return false;
	for (let i = 0; i < len1; i++) {
		if (key1[i] !== key2[i]) return false;
	}
	return true;
}

return {
	bytes7BitLength,
	convertUTF16toUTF8,
	encode7BitLength,
	keysEqual,
	wirePack,
	wirePackPre,
	wirePack7Bit,
	wireUnpack,
	wireUnpack7Bit,
}

}());

const UINT32_MAX = 4294967295;

/* convert utf16 to utf8 and append to dataview
 * idx:		 starting byte in dataview to write to
 * utf16in:  utf16 input
 * len:		 length (characters) of utf16in
 * dataview: DataView array to write to
 * returns: index of last byte written in dataview */
function convertUTF16toUTF8(idx, utf16in, len, dataview) {
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

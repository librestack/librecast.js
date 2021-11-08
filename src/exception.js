function LibrecastException(errorCode) {
	this.code = errorCode;
	this.name = lc.ErrorMsg[errorCode];
	this.errormsg = "ERROR (" + this.code + ") " + this.name;
}

/* 
 * librecast.js - librecast helper functions
 *
 * this file is part of LIBRECAST
 *
 * Copyright (c) 2017-2021 Brett Sheffield <brett@librecast.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program (see the file COPYING in the distribution).
 * If not, see <http://www.gnu.org/licenses/>.
 */

const LIBRECAST = (function () {

"use strict";

var lc = {};
lc.HEADER_LENGTH = 25;

lc.OP_NOOP              = 0x01;
lc.OP_SETOPT            = 0x02;
lc.OP_SOCKET_NEW        = 0x03;
lc.OP_SOCKET_GETOPT     = 0x04;
lc.OP_SOCKET_SETOPT     = 0x05;
lc.OP_SOCKET_LISTEN     = 0x06;
lc.OP_SOCKET_IGNORE     = 0x07;
lc.OP_SOCKET_CLOSE      = 0x08;
lc.OP_SOCKET_MSG        = 0x09;
lc.OP_CHANNEL_NEW       = 0x0a;
lc.OP_CHANNEL_GETMSG    = 0x0b;
lc.OP_CHANNEL_GETOPT    = 0x0c;
lc.OP_CHANNEL_SETOPT    = 0x0d;
lc.OP_CHANNEL_GETVAL    = 0x0e;
lc.OP_CHANNEL_SETVAL    = 0x0f;
lc.OP_CHANNEL_BIND      = 0x10;
lc.OP_CHANNEL_UNBIND    = 0x11;
lc.OP_CHANNEL_JOIN      = 0x12;
lc.OP_CHANNEL_PART      = 0x13;
lc.OP_CHANNEL_SEND      = 0x14;


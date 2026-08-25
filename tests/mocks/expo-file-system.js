'use strict';

class MockFile {
  uri;
  exists = true;
  constructor(...parts) {
    this.uri = parts.filter(Boolean).join('/');
  }
  text() { return ''; }
  bytes() { return new Uint8Array(); }
  write() {}
  delete() {}
}

class MockDirectory {
  uri;
  exists = true;
  constructor(...parts) {
    this.uri = parts.filter(Boolean).join('/');
  }
  list() { return []; }
  create() {}
  delete() {}
}

module.exports = {
  File: MockFile,
  Directory: MockDirectory,
  Paths: {
    document: 'file:///documents',
    cache: 'file:///cache',
    availableDiskSpace: 1024 * 1024 * 1024,
  },
};

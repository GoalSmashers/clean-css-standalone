TEST_DIR = test

all: test

test:
	@@vows ${TEST_DIR}/*-test.js

.PHONY: all test
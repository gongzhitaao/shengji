B = browserify
U = uglifyjs

all : shengji

shengji :
	$(B) shengji_client.js | \
	$(U) -m -r '$,require,exports,module' > $@.js

.PHONY : all shengji

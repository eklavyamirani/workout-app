.PHONY: init

init:
	@if [ "$$(basename "$$(pwd)")" != ".devcontainer" ]; then \
		echo "Error: Makefile must be run from within the .devcontainer directory"; \
		exit 1; \
	fi
	@# replace every "=" with =postgres to fill in default values
	@if [ ! -f .postgres.env ]; then \
		awk -F= '{print $$1"=postgres"}' .postgres.env.sample > .postgres.env; \
	fi

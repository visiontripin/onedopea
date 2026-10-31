# ONEDOPEA / EX — короткие команды для повседневной работы
PY ?= python3
PORT ?= 8000

.PHONY: help build check serve package all clean

help:
	@echo "make build    — собрать html-страницы из markdown"
	@echo "make check    — проверить ссылки, реестр и счётчики"
	@echo "make serve    — локальный сервер на http://localhost:$(PORT)"
	@echo "make package  — собрать _site/ для публикации"
	@echo "make all      — build + check + package"

build:
	$(PY) EX/tools/build_site.py

check:
	$(PY) EX/tools/check_links.py

serve:
	$(PY) -m http.server $(PORT) --bind 0.0.0.0

package: build
	$(PY) EX/tools/package_site.py

all: build check package

clean:
	rm -rf _site
	find . -name "__pycache__" -type d -prune -exec rm -rf {} +

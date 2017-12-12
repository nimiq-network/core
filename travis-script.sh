#!/bin/bash
set -e
cp -r ~/shared/* .
tar xzf node_modules.tar.gz
if [[ "$TO_TEST" == Karma/Travis_CI/Firefox_* ]] || [[ "$TO_TEST" == Karma/Travis_CI/Chrome_* ]]; then export DISPLAY=:99.0; fi
if [[ "$TO_TEST" == Karma/Travis_CI/Firefox_* ]] || [[ "$TO_TEST" == Karma/Travis_CI/Chrome_* ]]; then sh -e /etc/init.d/xvfb start; fi
if [[ "$TO_TEST" == Karma/SauceLabs/Chrome_Old ]]; then export KARMA_BROWSERS="SL_Chrome_61,SL_Chrome_60,SL_Chrome_59,SL_Chrome_58" TO_TEST=Karma; fi
if [[ "$TO_TEST" == Karma/SauceLabs/* ]]; then export KARMA_BROWSERS="SL_$(basename "$TO_TEST")" TO_TEST=Karma; fi
if [[ "$TO_TEST" == Karma/Travis_CI/Chrome_* ]] && [ "$KARMA_BROWSERS" = "" ]; then export KARMA_BROWSERS=Travis_Chrome TO_TEST=Karma USE_ISTANBUL=1; fi
if [[ "$TO_TEST" == Karma/Travis_CI/Firefox_* ]] && [ "$KARMA_BROWSERS" = "" ]; then export KARMA_BROWSERS=Firefox TO_TEST=Karma USE_ISTANBUL=1; fi
if [[ "$TO_TEST" == Karma/Travis_CI/* ]] && [ "$KARMA_BROWSERS" = "" ]; then export KARMA_BROWSERS=Safari TO_TEST=Karma; fi
if [ "$TO_TEST" = "Karma" ]; then node_modules/.bin/karma start; fi
if [ "$TO_TEST" = "NodeJS" ]; then node_modules/.bin/jasmine; fi
if [ "$TO_TEST" = "ESLint" ]; then node_modules/.bin/eslint src/main src/test *.js && node_modules/.bin/esdoc; fi
if [ "$USE_ISTANBUL" = "1" ]; then node_modules/.bin/codecov; fi

/*
 *      Copyright (c) 2014 Samsung Electronics Co., Ltd
 *
 *      Licensed under the Flora License, Version 1.1 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *              http://floralicense.org/license/
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

/*global define, console*/
/**
 * App module.
 *
 * @module app
 * @requires {@link core/systeminfo}
 * @requires {@link views/main}
 * @namespace app
 */

define({
    name: 'app',
    requires: [
        'core/systeminfo',
        'views/main'
    ],
    def: function initApp() {
        'use strict';

        /**
         * Initializes module.
         *
         * @memberof app
         * @public
         */
        function init() {
            console.log('APP::init');
        }

        return {
            init: init
        };
    }
});

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import RAL from '../common/ral';

import { setPseudo, localize, Options, LocalizeInfo, format, LocalizeFunc, InjectedContext } from '../common/common';
export { BundleFormat, Options, LocalizeInfo, LocalizeFunc, LoadFunc, KeyInfo } from '../common/common';

let nlsData: { [key: string]: string[] };
try {
	// Requiring this file will be intercepted by VS Code and will contain actual NLS data.
	// @ts-ignore
	nlsData = require('vscode-nls-web-data');
} catch(e) {
	console.error('Loading vscode-nls-web-data failed. Are you running this outside of VS Code? If so, you may need to intercept the import call with your bundled NLS data.');
	nlsData = {};
}

interface InternalOptions {
	locale: string | undefined;
	language: string | undefined;
	languagePackSupport: boolean;
	cacheLanguageResolution: boolean;
	languagePackId?: string;
	cacheRoot?: string;
}

let options: InternalOptions;

export function loadMessageBundle(context?: InjectedContext) {
	if (!context) {
		// No file. We are in dev mode. Return the default
		// localize function.
		return localize;
	}
	if (nlsData && nlsData[context.relativeFilePath]) {
		return createScopedLocalizeFunction(nlsData[context.relativeFilePath]);
	}
	return function (key: string | number | LocalizeInfo, message: string, ...args: any[]): string {
		if (typeof key === 'number') {
			throw new Error('Externalized strings were not present in the environment.');
		} else {
			return localize(key, message, ...args);
		}
	};
}

// This API doesn't really do anything in practice because the message bundle _has_ to be loaded
// ahead of time via 'vscode-nls-web-data'.
export function config(opts?: Options) {
	setPseudo(options?.locale?.toLowerCase() === 'pseudo');
	return loadMessageBundle;
}

function createScopedLocalizeFunction(messages: string[]): LocalizeFunc {
	return function (key: any, message: string, ...args: any[]): string {
		if (typeof key === 'number') {
			if (key >= messages.length) {
				console.error(`Broken localize call found. Index out of bounds. Stacktrace is\n: ${(<any>new Error('')).stack}`);
				return 'Failed to find string';
			}
			return format(messages[key], args);
		} else {
			if (typeof message === 'string') {
				console.warn(`Message ${message} didn't get externalized correctly.`);
				return format(message, args);
			} else {
				console.error(`Broken localize call found. Stacktrace is\n: ${(<any>new Error('')).stack}`);
			}
		}
		return 'Failed to find string';
	};
}

RAL.install(Object.freeze<RAL>({
	loadMessageBundle: loadMessageBundle,
	config: config
}));
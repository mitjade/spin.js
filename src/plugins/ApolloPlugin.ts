import * as path from 'path';

import requireModule from '../requireModule';
import { ConfigPlugin } from '../ConfigPlugin';
import { Builder } from '../Builder';
import Spin from '../Spin';
import JSRuleFinder from "./shared/JSRuleFinder";

let persistPlugins;

export default class ApolloPlugin implements ConfigPlugin {
    configure(builder: Builder, spin: Spin) {
        if (builder.stack.hasAll(['apollo', 'webpack'])) {
            const persistGraphQL = spin.options.persistGraphQL && !spin.test && !builder.stack.hasAny('dll');
            if (builder.stack.hasAny(['server', 'web']) && !builder.stack.hasAny('dll')) {
                if (!persistPlugins) {
                    const PersistGraphQLPlugin = requireModule('persistgraphql-webpack-plugin');
                    const moduleName = path.resolve('node_modules/persisted_queries.json');
                    if (persistGraphQL) {
                        const clientPersistPlugin = new PersistGraphQLPlugin({ moduleName,
                            filename: 'extracted_queries.json', addTypename: true });
                        const serverPersistPlugin = new PersistGraphQLPlugin({ moduleName,
                            provider: clientPersistPlugin });
                        persistPlugins = { client: clientPersistPlugin, server: serverPersistPlugin };
                    } else {
                        // Dummy plugin instances just to create persisted_queries.json virtual module
                        const clientPersistPlugin = new PersistGraphQLPlugin({ moduleName });
                        const serverPersistPlugin = new PersistGraphQLPlugin({ moduleName });
                        persistPlugins = { client: clientPersistPlugin, server: serverPersistPlugin };
                    }
                }
            }

            builder.config = spin.merge(builder.config, {
                module: {
                    rules: [
                        {
                            test: /\.graphqls/,
                            use: 'raw-loader',
                        },
                        {
                            test: /\.(graphql|gql)$/,
                            exclude: /node_modules/,
                            use: ['graphql-tag/loader'].concat(
                                persistGraphQL ?
                                    ['persistgraphql-webpack-plugin/graphql-loader'] :
                                    [],
                            ),
                        },
                    ],
                },
            });

            if (builder.stack.hasAny(['server', 'web'])) {
                const webpack = requireModule('webpack');
                const jsRuleFinder = new JSRuleFinder(builder);
                const jsRule = jsRuleFinder.rule;
                jsRule.use = spin.merge(jsRule.use, persistGraphQL ?
                    ['persistgraphql-webpack-plugin/js-loader'] :
                    []
                );

                builder.config = spin.merge(builder.config, {
                    plugins: [
                        new webpack.DefinePlugin({__PERSIST_GQL__: persistGraphQL})
                    ].concat(builder.stack.hasAny('dll') ? [] : [
                        builder.stack.hasAny('server') ?
                            persistPlugins.server :
                            persistPlugins.client
                    ])
                });
            }
        }
    }
}
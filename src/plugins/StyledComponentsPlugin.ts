import Spin from "../Spin";
import { ConfigPlugin } from "../ConfigPlugin";
import { Builder } from "../Builder";
import requireModule from '../requireModule';
import JSRuleFinder from './shared/JSRuleFinder';

export default class StyledComponentsPlugin implements ConfigPlugin {
    configure(builder: Builder, spin: Spin) {
        const stack = builder.stack;

        if (stack.hasAll(['styled-components', 'webpack']) &&
            (stack.hasAny('web') || (stack.hasAny('server') && spin.options.ssr))) {

            const jsRuleFinder = new JSRuleFinder(builder);
            const jsRule = jsRuleFinder.rule;
            jsRule.use = spin.merge(jsRule.use, {
                options: {
                    plugins: [
                        [requireModule.resolve('babel-plugin-styled-components'), {'ssr': spin.options.ssr}],
                    ],
                },
            });
        }
    }
}
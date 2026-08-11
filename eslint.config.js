// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{ allowExpressions: true },
			],
			"@typescript-eslint/switch-exhaustiveness-check": "error",
			"@typescript-eslint/no-non-null-assertion": "error",
		},
	},
	{
		files: ["tests/**/*.ts"],
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
		},
	},
	{
		// The simulation must stay headless: no DOM, no rendering, no app.
		files: ["src/{core,contracts,models,systems,config}/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["**/render/**", "**/app/**"],
							message:
								"The simulation layer must not depend on rendering or app code.",
						},
					],
				},
			],
		},
	}
);

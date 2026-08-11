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
		files: ["**/*.test.ts"],
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
		},
	}
);

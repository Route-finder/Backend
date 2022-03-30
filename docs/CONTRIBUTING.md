# New contributor guide

## Issues

### Create a new issue

If you spot a problem with the module, [search if an issue already exists](https://github.com/isaac-list/classify/issues/). If the issue you've encountered
has not yet been documented, you can create a new issue.

## Contributing

### Getting Set Up

#### Cloning the Project:
To contribute to the project, it is expected that you first create a fork of the repository and clone that repository to your machine.
Github has easy-to-follow documentation on this process available here: https://docs.github.com/en/get-started/quickstart/contributing-to-projects 

#### Installing Node dependencies
To run the project locally on your machine, you must first install the NPM packages upon which the project depends. First, ensure that Node and NPM
are installed (we recommend using [NVM, the Node Version Manager](https://github.com/nvm-sh/nvm)). Then, run `npm install` in the root of the repository’s
directory. This will install the packages recorded in package.json as dependencies.

To run the project locally, enter `npm start`.

### Pull Request

When you're finished with the changes, create a pull request, also known as a PR.

  1. Push all local commits to your fork of the repository.
  2. On your fork's main GitHub page, click "Contribute" and then "Open Pull Request".
  3. Give your PR a title, and briefly describe the changes you have made. Keep each pull request limited in its scope, so that changes are more modular.
  4. If necessary, or if you would like help with your work, request a Reviewer (see Code Review below).

### Code Review

Consider whether you should request a review of your code from another contributor. You should request a manua code review if:
 - One or more unit tests are failing
 - The PR addresses a long-standing bug or introduces new behavior
 - The code uses constructs unfamiliar to the other contributors

#### Code Review Etiquette

CSS Tricks has a [well-written guide](https://css-tricks.com/code-review-etiquette/#aa-quick-tips-for-improving-code-review-etiquette)
to maintaining respectful etiquette in a Code Review process. The article is worth a read-through, but in summary:
  1. Remove the person: use "we" instead of "I" and "you" to reflect that reviewing code is a collaborative activity.
  2. Keep conversation focused on technical problems and solutions. Avoid emotional responses, and instead use clarifying questions to direct discussion.
  3. Review the code, not the author. Programming is as creative as it is technical, and each person approaches it differently. Where possible, seek to
     correct mistakes by teaching, rather than dismissal. If there is a conflict about coding style, refer to the project Style Guide.

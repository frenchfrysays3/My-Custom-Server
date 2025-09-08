# My Custom Server
I have decided to open-source this project as it is not port-forwarded.

## Deployment

### Terminal Deployment
1. install [git](https://git-scm.com/downloads)
2. install [node.js](https://nodejs.org/en/download/current)
3. run `git clone https://github.com/frenchfrysays3/My-Custom-Server.git`
4. go to the folder in your terminal using `cd`
5. type `npm i` and `node index` to start


### Deploy to Codespaces
1. Make a Codespace. I am assuming you already know how.
2. In the terminal, type `npm i` and `node index` to start.

I don't know any more deployment services, if you do, please make a pull request.

## Required files and folders
These are the required file and folders:

- public/
- auth.json (it's in the .gitignore so you have to create it)
- public/errors/
- public/errors/404.html

package-lock.json is automatically created when you install dependencies.
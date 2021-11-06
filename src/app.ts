
import * as express from "express";
import * as bodyParser from "body-parser";

class App {

    public app: express.Application;

    constructor() {
        this.app = express();
        this.config();        
    }

    private config(): void{
        // Giúp chúng ta tiếp nhận dữ liệu từ body của request
        this.app.use(express.urlencoded({ extended: false }));
    }

}

export default new App().app;
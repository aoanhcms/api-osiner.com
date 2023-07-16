import * as express from "express";
import * as mongoose from "mongoose";

import MySql from './mysqlConnect'
import { Routes } from "./routes/crmRoutes";
import WsServer from './websocket';

class App {
    private mySql: MySql = new MySql({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'osiner.s',
    });
    private wsServer: WsServer = new WsServer(6968)
    public mongoUrl: string = 'mongodb://localhost:27017/CRMdb';
    public app: express.Application = express();
    public routePrv: Routes = new Routes();
    constructor() {
        this.app = express();
        this.config();
        //websocket init
        this.wsServer.start()
        this.mongoSetup();
        this.routePrv.routes(this.app);
        
    }

    private config(): void{
        // Giúp chúng ta tiếp nhận dữ liệu từ body của request
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    private mongoSetup(): void{
        mongoose.connect(this.mongoUrl);        
    }
}

export default new App().app;
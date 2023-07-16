import {NextFunction, Request, Response} from "express";

import pageRoutes from './pageRoutes'

export class Routes { 
    
    private pageRoutes: pageRoutes = new pageRoutes();
    
    public routes(app): void {   
        this.pageRoutes.routes(app, '/page');
        
        app.route('/')
        .get((req: Request, res: Response) => {            
            res.status(200).send({
                message: 'GET request successfulll!!!!'
            })
        })
    }
}
import {NextFunction, Request, Response} from "express";

export default class pageRoutes { 
    
    public routes(app, path = '/pages'): void {   
        
        app.route(path + '/')
        .get((req: Request, res: Response) => {            
            res.status(200).send({
                message: 'GET request successfulll!!!!'
            })
        })

    }
}
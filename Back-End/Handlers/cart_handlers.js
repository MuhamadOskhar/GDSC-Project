const mysql = require('mysql2')
const { Router } = require('express')

const { HashFunction } = require('../Utility/hash.js')
const { JWTUtil } = require('../Utility/jwt.js')
const { verifyJWTMiddleware } = require('../Middleware/verifyJWTToken.js')

/**
 * @param {Router} router 
 * @param {mysql.Connection} dbConnection 
 */

function setupCartHandler (router, dbConnection) {
    const hashFunction = new HashFunction()
    const jwtUtil = new JWTUtil()

    // Mengambil Cart
    router.get('/', verifyJWTMiddleware(jwtUtil), async(request, response) => {
        try {
            const getId = request.user.userID
            const data = request.body.user_id
            let priceAccumulation = 0

            if (getId != data ){
                response.status(403).json({
                    "status": false,
                    "message": "doesnt have access",
                    "result": null
                })
                return
            }
            
            const sql = "SELECT c.id AS cart_id,l.name, c.quantity, (l.price * c.quantity) AS total_price FROM cart_table c JOIN laptop_table l ON c.laptop_id = l.id WHERE c.user_id = ?"
            const [rows] = await dbConnection.query(sql, data)

            // Menghitung total harga
            rows.forEach(row => {
            priceAccumulation += row.total_price;
            })
           
            response.json({
                "status": true,
                "message": "Data ada",
                "Laptop": rows,
                "ammount of data": rows.length,
                "price accumulation": priceAccumulation
            })

        } catch (error) {
            console.log(error)
            response.status(500).json({
                "status": false,
                "message": "Internal server error",
                "result": error
            })
        }
    })

    // Menambah Cart
    router.post('/', verifyJWTMiddleware(jwtUtil), async (request, response) => {
        try {
            const data = [
                request.body.id_user,
                request.body.id_laptop,
                request.body.quantity
            ];
            const getId = request.user.userID
        
            if (getId != data[0]) {
                response.status(403).json({
                    "status": false,
                    "message": "doesnt have access",
                    "result": null
                })
                return
            }
            // Pengecekan keberadaan data dalam cart
            const sqlCheck = "SELECT * FROM cart_table WHERE user_id = ? AND laptop_id = ? ";
            const [rowsCheck] = await dbConnection.query(sqlCheck, [data[0], data[1]]);
    
            // Cek apakah data sudah ada
            const isDataExists = rowsCheck.length > 0;
    
            if (isDataExists) {
                // Jika data sudah ada, lakukan update
                const sqlDataAlreadyExist = "UPDATE cart_table SET quantity = ? WHERE user_id = ? AND laptop_id = ?";
                const result = await dbConnection.query(sqlDataAlreadyExist, [data[2], data[0], data[1]]);
    
                response.json({
                    "status": true,
                    "message": "Cart updated successfully",
                });
            } else {
                // Jika data belum ada, lakukan insert
                const sqlInsert = "INSERT INTO cart_table (user_id, laptop_id, quantity) VALUES (?, ?, ?)";
                const result = await dbConnection.query(sqlInsert, [data[0], data[1], data[2]]);
    
                response.json({
                    "status": true,
                    "message": "Cart added successfully",
                });
            }
        } catch (error) {
            response.status(500).json({
                "status": false,
                "message": "Internal server error",
                "message_2": "Kesalahan input data pada user_id, ataupun Laptop_id",
                "result": error
            });
        }
    });
    
  
    

// Mengubah cart
    router.put('/', verifyJWTMiddleware(jwtUtil), async (request, response) => {
        try {
            const data = [
            request.body.cart_id,
            request.body.quantity
            ];
            const getId = request.user.userID

            const sqlCheck = "SELECT * FROM cart_table WHERE id = ?";
            const [rows] = await dbConnection.query(sqlCheck, data[0]);
           

            if (rows.length > 0) {
                const userIdCheck = rows[0]

            
                if (getId != userIdCheck.user_id){
                    response.status(403).json({
                        "status": false,
                        "message": "doesnt have access",
                        "result": null
                    })
                    return
                }
                const sql = "UPDATE cart_table SET quantity = ? WHERE id = ?";
                const result = await dbConnection.query(sql, [data[1], data[0]]);
            
                response.json({
                    "status": true,
                    "message": "Cart updated successfully"
                })
            } else {
                response.status(400).json({
                    "status": false,
                    "message": "Data not found"
                });
            }
        } catch (error) {
            response.status(500).json({
                "status": false,
                "message": "Internal server error",
                "result": error
            });
        }
    });


    // Menghapus Cart
    router.delete('/', verifyJWTMiddleware(jwtUtil), async(request, response) => {
        try {
            const data =[
                request.body.cart_id
            ]
            const getId = request.user.userID

            const sqlCheck = "SELECT * FROM cart_table WHERE id = ?"
            const [rows] = await dbConnection.query(sqlCheck, data[0])
            if (rows.length > 0) {
                const userIdCheck = rows[0]

            
                if (getId != userIdCheck.user_id){
                    response.status(403).json({
                        "status": false,
                        "message": "doesnt have access",
                        "result": null
                    })
                    return
                }
                const sql = "DELETE FROM cart_table WHERE id  = ?"
            const result = await dbConnection.query(sql, data[0])
            response.status(200).json({
                "status": true,
                "message": "Cart deleted successfully"
            })
            } else {
                response.status(400).json({
                    "status": false,
                    "message": "Data not found"
                });
            }

           
        } catch (error) {
            response.status(500).json({
                "status": false,
                "message": "Internal server error",
                "result": error
            })
        }
    })


    return router
 }

 module.exports = {setupCartHandler}
import * as mysql from 'mysql'

import { errorMonitor } from 'events';

class MysqlConnect {

  private connection
  
  constructor(conf) {
    this.connection = mysql.createConnection(conf);
    this.connection.connect((err) => {
      if (err) {
        console.error('Lỗi kết nối: ', err);
        return;
      }
      console.log('Đã kết nối thành công đến MySQL.');
    
      // Thiết lập logic duy trì kết nối
      setInterval(() => {
        this.connection.query('SELECT 1', (error) => {
          if (error) {
            console.error('Lỗi duy trì kết nối: ', error);
            this.connection.connect(); // Kết nối lại nếu mất kết nối
          }
        });
      }, 5000); // Kiểm tra kết nối mỗi 5 giây
    });
  }
  query(sql) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, (error, results) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(results)
      });
    })
  }
}
export default MysqlConnect
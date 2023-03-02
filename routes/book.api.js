const express = require('express');
const path = require('path');
const router = express.Router();
const fs = require('fs');
const { set } = require('../app');
/**
 * params: /
 * description: get all books
 * query:
 * method: get
 */
const db = JSON.parse(fs.readFileSync('./db.json', 'utf-8'));
const dataBooks = db.books;
const count = dataBooks.length;
router.get('/', (req, res, next) => {
   //  const { query, url } = req;
   let filterQuery = req.query;
   let filter = {
      author: filterQuery.author,
      country: filterQuery.country,
      language: filterQuery.language,
      title: filterQuery.title,
      year: parseInt(filterQuery.year),
      page: parseInt(filterQuery.page) || 1,
      limit: parseInt(filterQuery.limit * filterQuery.page) || 10,
   }; // condition to filter
   try {
      let result = dataBooks;
      const filterKey = Object.keys(filter);

      Object.keys(filterQuery).forEach((key) => {
         if (!filterKey.includes(key)) {
            const exception = new Error(`Query ${key} is not allowed`);
            exception.statusCode = 401;
            throw exception;
         }
      }); // query key have key not have in filter

      filterKey.forEach((key) => {
         if (!filter[key]) delete filter[key]; // delete key empty string
      });

      if (Object.keys(filter).length === 2) {
         // if filter ony have page and limit
         if (filter.page === 1) {
            result = result.slice(0, filter.limit);
         } else {
            let start = filter.limit * (filter.page - 1);
            result = result.slice(start, filter.limit * filter.page);
         }
         result = {
            data: result,
            count,
            page: Math.ceil(count / filter.limit),
         };
         return res.status(200).send(result);
      }

      result = result.filter((book) => {
         let keyValid = Object.keys(filter).slice(
            0,
            Object.keys(filter).length - 2,
         );
         let value = keyValid.find((e) => {
            if (book[e].includes(filter[e])) {
               return book;
            }
            return false;
         });
         return value;
      });
      let indexOne = '';
      result = result.filter((book) => {
         if (book.title !== indexOne) {
            indexOne = book.title;
            return book;
         }
      });

      if (filter.page === 1) {
         result = result.slice(0, filter.limit);
      } else {
         let start = filter.limit * (filter.page - 1);
         result = result.slice(start, filter.limit * filter.page);
      }
      if (result.length === 0) return res.send('Not found book');

      // console.log(result.length);
      result = {
         data: result,
         count,
         page: Math.ceil(count / filter.limit),
      };
      return res.status(200).send(result);
   } catch (error) {
      next(error);
   }
});

router.post('/', async (req, res, next) => {
   const body = req.body;
   let filter = {
      author: body.author, // must not empty
      country: body.country,
      imageLink: body.imageLink,
      language: body.language, // must not empty
      link: body.link,
      pages: Math.abs(parseInt(body.pages)), // must not empty
      title: body.title,
      year: parseInt(body.year),
      id: Math.random().toString(36).substring(2, 13).toLocaleUpperCase(),
   };
   try {
      let filterKey = Object.keys(filter);
      let bodyKey = Object.keys(body);
      let requiredValue = ['author', 'title', 'language'];
      bodyKey.forEach((key) => {
         const exception = new Error(' Bad request');
         exception.statusCode = 400;
         //  console.log(filterKey.includes(key), key);
         if (requiredValue.includes(key) && !filter[key]) {
            // check value  must not empty
            throw exception;
         }
         if (!filterKey.includes(key) || body.id) {
            // check key not have filter and body no have id
            throw exception;
         }
      });
      dataBooks.forEach((book) => {
         let duplicateValue = ['id', 'author']; // check the book had in db
         duplicateValue.forEach((value) => {
            if (book[value] === filter[value]) {
               const exception = new Error(' Duplicate Book');
               exception.statusCode = 405;
               throw exception;
            }
         });
      });
      db.books.push(filter);
      fs.writeFile('./db.json', JSON.stringify(db), (err, res) => {
         if (err) {
            // something wrong and  book cant update
            err.statusCode = 503;
            throw err;
         }
         oke();
      });
      function oke() {
         res.status(200).send('oke');
      }
   } catch (error) {
      next(error);
   }
});

router.put('/:bookId', (req, res, next) => {
   let { bookId } = req.params;
   const body = req.body;
   let filter = {
      author: body.author,
      country: body.country,
      imageLink: body.imageLink,
      language: body.language,
      link: body.link,
      pages: body.pages ? Math.abs(parseInt(body.pages)) : null, // must  numbles
      title: body.title,
      year: body.year ? parseInt(body.year) : null, // must numbles
   };
   try {
      let filterKey = Object.keys(filter);
      let bodyKey = Object.keys(body);
      if (!dataBooks.some((book) => book.id === bookId)) {
         const exception = new Error(' Bad request');
         exception.statusCode = 400;
         throw exception;
      }
      bodyKey.forEach((key) => {
         let valueNumbles = ['year', 'pages'];
         const exception = new Error(' Bad request');
         exception.statusCode = 400;
         if (valueNumbles.includes(key) && isNaN(body[key])) {
            throw exception;
         }
         if (!filterKey.includes(key) || body.id) {
            throw exception;
         }
      });
      filterKey.forEach((key) => {
         if (!filter[key]) delete filter[key];
      });
      let result = dataBooks.map((book) => {
         let filterKeyAfterFilter = Object.keys(filter);
         if (book.id === bookId) {
            filterKeyAfterFilter.forEach((key) => (book[key] = filter[key]));
            return book;
         } else {
            return book;
         }
      });
      db.books = result;
      fs.writeFile('db.json', JSON.stringify(db), (err, res) => {
         if (err) {
            // something wrong and  book cant update
            err.statusCode = 503;
            throw err;
         }
         oke();
      });
      function oke() {
         res.status(200).send('oke');
      }
   } catch (error) {
      next(error);
   }
});
router.delete('/:bookId', (req, res, next) => {
   let { bookId } = req.params;
   try {
      // console.log(db.books.length);
      let index = dataBooks.findIndex((book) => book.id === bookId);
      if (index < 0) {
         const exception = new Error(' Bad request');
         exception.statusCode = 400;
         throw exception;
      }

      db.books.splice(index, 1);
      fs.writeFile('db.json', JSON.stringify(db), (err, res) => {
         if (err) {
            // something wrong and  book cant update
            err.statusCode = 503;
            throw err;
         }
         oke();
      });
      function oke() {
         res.status(200).send('oke');
      }
   } catch (error) {
      next(error);
   }
});

module.exports = router;

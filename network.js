const axios = require('axios')
  .create({
    maxRedirects: 0,
  });
const _ = require('lodash');

const fetchStores = () => new Promise((resolve, reject) => {
  axios.get('https://yoga.fanyu.cn/api/store/list', {
    params: {
      'page.current': 1,
      'page.size': -1,
    },
  })
    .then((response) => {
      if (_.get(response.data, 'status') === 'OK') {
        resolve(_.get(response.data, 'content.list', []));
      } else {
        reject(new Error(`Error response. data => ${JSON.stringify(response.data)}`));
      }
    })
    .catch((error) => {
      reject(error);
    });
});

const fetchCourses = (payload) => new Promise((resolve, reject) => {
  const {
    date,
    storeId,
  } = payload ?? {};

  axios.get('https://yoga.fanyu.cn/api/course/planList', {
    params: {
      begin: date,
      storeId,
      courseType: 1,
      'page.current': 1,
      'page.size': -1,
    },
  })
    .then((response) => {
      if (_.get(response.data, 'status') === 'OK') {
        resolve(_.flatMap(_.get(response.data, 'content', [])));
      } else {
        reject(new Error(`Error response. data => ${JSON.stringify(response.data)}`));
      }
    })
    .catch((error) => {
      reject(error);
    });
});

const login = (username, password) => new Promise((resolve, reject) => {
  axios.postForm('https://yoga.fanyu.cn/api/user/login', {
    username,
    password,
    rememberMe: 1,
  })
    .then((response) => {
      if (_.get(response.data, 'status') === 'OK') {
        const user = _.get(response.data, 'content', {});
        axios.defaults.headers.common.token = user.token;
        resolve(user);
      } else {
        reject(new Error(`Error response. data => ${JSON.stringify(response.data)}`));
      }
    })
    .catch((error) => {
      reject(error);
    });
});

const fetchUserCards = () => new Promise((resolve, reject) => {
  axios.get('https://yoga.fanyu.cn/api/user-card/list', {
    params: {
      status: 1,
      'page.current': 1,
      'page.size': -1,
    },
  })
    .then((response) => {
      if (_.get(response.data, 'status') === 'OK') {
        resolve(_.get(response.data, 'content.list', []));
      } else {
        reject(new Error(`Error response. data => ${JSON.stringify(response.data)}`));
      }
    })
    .catch((error) => {
      reject(error);
    });
});

const fetchUserCourses = () => new Promise((resolve, reject) => {
  axios.get('https://yoga.fanyu.cn/api/user-course/list', {
    params: {
      'page.current': 1,
      'page.size': -1,
    },
  })
    .then((response) => {
      if (_.get(response.data, 'status') === 'OK') {
        resolve(_.get(response.data, 'content.list', []));
      } else {
        reject(new Error(`Error response. data => ${JSON.stringify(response.data)}`));
      }
    })
    .catch((error) => {
      reject(error);
    });
});

const bookCourse = (courseId, cardId) => new Promise((resolve, reject) => {
  axios.postForm('https://yoga.fanyu.cn/api/user-course/yuyue', {
    coursePlanId: courseId,
    userCardId: cardId,
  })
    .then((response) => {
      if (_.get(response.data, 'status') === 'OK') {
        resolve(response.data);
      } else {
        reject(new Error(`Error response. data => ${JSON.stringify(response.data)}`));
      }
    })
    .catch((error) => {
      reject(error);
    });
});

const cancelCourse = (bookId) => new Promise((resolve, reject) => {
  axios.postForm('https://yoga.fanyu.cn/api/user-course/cancel', {
    id: bookId,
    remark: 1,
  })
    .then((response) => {
      if (_.get(response.data, 'status') === 'OK') {
        resolve(response.data);
      } else {
        reject(new Error(`Error response. data => ${JSON.stringify(response.data)}`));
      }
    })
    .catch((error) => {
      reject(error);
    });
});

module.exports = {
  fetchStores,
  fetchCourses,
  fetchUserCards,
  fetchUserCourses,
  bookCourse,
  cancelCourse,
  login,
};

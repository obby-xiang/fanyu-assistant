// Modules to control application life and create native browser window
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  nativeImage,
  Menu,
  Tray,
  MenuItem,
  Notification,
} = require('electron');
const path = require('path');
const util = require('util');
const _ = require('lodash');
const winston = require('winston');
const { DateTime } = require('luxon');
const { randomUUID } = require('crypto');
const network = require('./network');
const database = require('./database');

app.setLoginItemSettings({
  openAtLogin: true,
});

const stringify = (input) => (_.isPlainObject(input) || _.isArray(input) ? util.format('%o', input) : _.toString(input));

const BOOK_REQUESTS_PROCESSING_INTERVAL = 10 * 1000;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp({ format: 'YYYY-MM-dd HH:mm:ss.SSS' }),
  ),
  transports: [
    new winston.transports.File({
      filename: path.resolve(app.getPath('userData'), './app.log'),
      format: winston.format.combine(
        winston.format.json(),
      ),
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.align(),
        winston.format.colorize({ all: true }),
        winston.format.printf(({
          level,
          message,
          timestamp,
        }) => `${timestamp} ${level} ${stringify(message)}`),
      ),
    }),
  ],
});

const toDateTime = (input) => {
  if (DateTime.isDateTime(input)) {
    return input;
  }

  if (_.isDate(input)) {
    return DateTime.fromJSDate(input);
  }

  if (_.isString(input)) {
    return DateTime.fromISO(input);
  }

  return DateTime.now();
};

const matchBookRequest = (course, bookRequest) => {
  const dateTime = DateTime.fromFormat(`${course.beginTime_D} ${course.beginTime_}`, 'yyyy-MM-dd HH:mm');
  if (_.indexOf(bookRequest.days, dateTime.weekday) < 0) {
    return false;
  }

  const start = DateTime.fromFormat(`${course.beginTime_D} ${toDateTime(bookRequest.timeRange[0])
    .toFormat('HH:mm')}`, 'yyyy-MM-dd HH:mm');
  const end = DateTime.fromFormat(`${course.beginTime_D} ${toDateTime(bookRequest.timeRange[1])
    .toFormat('HH:mm')}`, 'yyyy-MM-dd HH:mm');

  return dateTime.toMillis() >= start.toMillis() && dateTime.toMillis() <= end.toMillis();
};

const processBookRequests = async () => {
  logger.info('Start to process book requests.');

  const isBookRequestProcessing = await database.get('isBookRequestProcessing');
  logger.info(`Get value [isBookRequestProcessing] => ${isBookRequestProcessing}.`);
  if (!isBookRequestProcessing) {
    return;
  }

  const account = await database.get('account');
  logger.info(`Get value [account] => ${stringify(account)}.`);
  if (!(account && account.username && account.password)) {
    return;
  }

  const bookRequests = await database.get('bookRequests');
  logger.info(`Get value [bookRequests] => ${stringify(bookRequests)}.`);
  if (_.isEmpty(bookRequests)) {
    return;
  }

  const enabledBookRequests = _.filter(bookRequests, (bookRequest) => bookRequest.enable);
  if (_.isEmpty(enabledBookRequests)) {
    return;
  }

  const bookedCourses = await database.get('bookedCourses');
  logger.info(`Get value [bookedCourses] => ${stringify(bookedCourses)}.`);

  let user;
  try {
    user = await network.login(account.username, account.password);
  } catch (error) {
    logger.error(`Login failed.\nerror => ${stringify(error)}`);
    return;
  }

  logger.info(`Login successfully.\nuser => ${stringify(user)}`);

  let userCards;
  try {
    userCards = await network.fetchUserCards();
  } catch (error) {
    logger.error(`Fetch user cards failed.\nerror => ${stringify(error)}`);
    return;
  }

  logger.info(`Fetch user cards successfully.\nuserCards => ${stringify(userCards)}`);

  const userCard = _.find(userCards, (item) => item.canUse);
  if (!userCard) {
    return;
  }

  const courses = {};
  await _.forEach(enabledBookRequests, async (bookRequest) => {
    logger.info(`Processing book request.\nbookRequest => ${stringify(bookRequest)}.`);

    let storeCourses;

    if (courses[bookRequest.storeId]) {
      storeCourses = courses[bookRequest.storeId];
    } else {
      logger.info(`Fetch courses of store [${bookRequest.storeId}].`);

      const now = DateTime.now();

      try {
        storeCourses = _.concat(
          await network.fetchCourses({
            storeId: bookRequest.storeId,
            date: now.startOf('week')
              .toFormat('yyyy-MM-dd'),
          }),
          await network.fetchCourses({
            storeId: bookRequest.storeId,
            date: now.endOf('week')
              .plus({ days: 1 })
              .toFormat('yyyy-MM-dd'),
          }),
        );
      } catch (error) {
        logger.error(`Fetch courses failed.\nerror => ${stringify(error)}`);
        return;
      }

      storeCourses = _.filter(storeCourses, (course) => course.canJoin);

      logger.info(`Fetch courses successfully.\ncourses => ${stringify(storeCourses)}`);
      courses[bookRequest.storeId] = storeCourses;
    }

    await _.forEach(storeCourses, async (course) => {
      if (_.find(bookedCourses, (bookedCourse) => course.id === bookedCourse.id)) {
        return;
      }

      if (matchBookRequest(course, bookRequest)) {
        logger.info(`Start to book course.\ncourse => ${stringify(course)}\nbookRequest => ${stringify(bookRequest)}`);

        new Notification({
          urgency: 'critical',
          timeoutType: 'never',
          icon: nativeImage.createFromPath(path.resolve(__dirname, './assets/logo.png')),
          title: '预约成功通知',
          body: `课程：${course.course.name}\n时间：${course.beginTime_D} ${course.beginTime_}\n门店：${course.store.name}`,
        }).show();

        let bookResult;
        try {
          bookResult = await network.bookCourse(course.id, userCard.id);
        } catch (error) {
          logger.error(`Book course failed.\nerror => ${stringify(error)}`);
          return;
        }

        logger.info(`Book course successfully.\nbookResult => ${stringify(bookResult)}`);

        bookedCourses.push({
          ...course,
          bookedAt: DateTime.now()
            .toJSDate(),
        });
        await database.put('bookedCourses', bookedCourses);
      }
    });
  });
};

async function createWindow() {
  const keys = await database.keys()
    .all();
  if (_.indexOf(keys, 'account') < 0) {
    logger.info('Initialize value [account] => {}.');
    await database.put('account', {});
  }
  if (_.indexOf(keys, 'bookRequests') < 0) {
    logger.info('Initialize value [bookRequests] => [].');
    await database.put('bookRequests', []);
  }
  if (_.indexOf(keys, 'isBookRequestProcessing') < 0) {
    logger.info('Initialize value [isBookRequestProcessing] => false.');
    await database.put('isBookRequestProcessing', false);
  }
  if (_.indexOf(keys, 'bookedCourses') < 0) {
    logger.info('Initialize value [bookedCourses] => [].');
    await database.put('bookedCourses', []);
  }

  const isBookRequestProcessing = await database.get('isBookRequestProcessing');
  logger.info(`Get value [isBookRequestProcessing] => ${isBookRequestProcessing}.`);

  let bookIntervalId;
  if (isBookRequestProcessing) {
    logger.info('Start book requests processing interval.');
    await processBookRequests();
    bookIntervalId = setInterval(processBookRequests, BOOK_REQUESTS_PROCESSING_INTERVAL);
  }

  const logo = nativeImage.createFromPath(path.resolve(__dirname, './assets/logo.png'));
  const logoProcessing = nativeImage.createFromPath(path.resolve(__dirname, './assets/logo-processing.png'));

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: isBookRequestProcessing ? logoProcessing : logo,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
    },
  });

  mainWindow.setMenu(null);

  const tray = new Tray(isBookRequestProcessing ? logoProcessing : logo);
  tray.setTitle('fanyu-assistant');
  tray.setToolTip('fanyu-assistant');
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  const processingMenuItem = new MenuItem({
    label: '处理预约',
    type: 'checkbox',
    checked: isBookRequestProcessing,
    click(item) {
      database.put('isBookRequestProcessing', item.checked);
    },
  });
  const exitMenuItem = new MenuItem({
    label: '退出应用',
    click() {
      const result = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        message: '确定退出应用？',
        buttons: ['确定', '取消'],
        defaultId: 1,
      });

      if (result === 0) {
        mainWindow.destroy();
      }
    },
  });
  const contextMenu = Menu.buildFromTemplate([
    processingMenuItem,
    exitMenuItem,
  ]);

  tray.setContextMenu(contextMenu);

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.setSkipTaskbar(true);
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    logger.info('App finished.');
  });

  database.on('put', async (key, value) => {
    logger.info(`On database [put] event.\nkey => ${key}\nvalue => ${stringify(value)}`);

    mainWindow.webContents.send('database-put', key, value);

    if (key === 'isBookRequestProcessing') {
      processingMenuItem.checked = value;
      mainWindow.setIcon(value ? logoProcessing : logo);
      tray.setImage(value ? logoProcessing : logo);

      if (value) {
        if (_.isNil(bookIntervalId)) {
          logger.info('Start book requests processing interval.');
          await processBookRequests();
          bookIntervalId = setInterval(processBookRequests, BOOK_REQUESTS_PROCESSING_INTERVAL);
        }
      } else if (!_.isNil(bookIntervalId)) {
        logger.info('Stop book requests processing interval.');
        clearInterval(bookIntervalId);
        bookIntervalId = null;
      }
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL('http://localhost:8080/');
  // mainWindow.loadFile(path.join(__dirname, './app/index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

if (app.requestSingleInstanceLock()) {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.

  logger.info('App starting...');

  app.whenReady()
    .then(async () => {
      logger.info('App is ready.');

      ipcMain.handle('network', (event, name, ...args) => network[name](...args));
      ipcMain.handle('database', (event, name, ...args) => database[name](...args));
      ipcMain.handle('uuid', (event, options) => randomUUID(options));

      await createWindow();

      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
} else {
  logger.error('App already started.');
}

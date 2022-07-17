<template>
  <el-container class="tw-container tw-mx-auto tw-p-4">
    <el-main class="tw-mx-auto tw-max-w-xl">
      <h1 class="tw-text-lg tw-font-medium tw-mb-4">账号</h1>
      <el-form :model="state.accountForm" label-position="right" label-width="6rem">
        <el-form-item label="用户名">
          <el-input v-if="state.isAccountEditing" v-model="state.accountForm.username" type="text"/>
          <span v-else>{{ state.account.username }}</span>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-if="state.isAccountEditing" v-model="state.accountForm.password"
                    show-password type="password"/>
          <span v-else>
            <span>{{ state.isAccountPasswordVisible ? state.account.password : '••••••' }}</span>
            <el-button :icon="state.isAccountPasswordVisible ? IconView : IconHide" class="tw-ml-1"
                       link type="primary"
                       @click="state.isAccountPasswordVisible = !state.isAccountPasswordVisible"/>
          </span>
        </el-form-item>
        <el-form-item>
          <el-button v-if="!state.isAccountEditing" type="primary"
                     @click="setAccountEditable(true)">
            编辑
          </el-button>
          <el-button v-if="state.isAccountEditing" type="primary" @click="saveAccount">
            保存
          </el-button>
          <el-button v-if="state.isAccountEditing" @click="setAccountEditable(false)">
            取消
          </el-button>
          <el-button type="success" @click="validateAccount">测试</el-button>
        </el-form-item>
      </el-form>
      <el-divider/>

      <h1 class="tw-text-lg tw-font-medium tw-mb-4">预约请求</h1>
      <div class="tw-flex tw-flex-row tw-justify-between tw-space-x-4">
        <el-button :icon="IconPlus" circle type="primary" @click="showBookRequestFormDialog"/>
        <div class="tw-space-x-4">
          <el-button circle type="success"
                     @click="state.isBookRequestProcessing = !state.isBookRequestProcessing">
            <el-icon v-if="state.isBookRequestProcessing" class="is-loading">
              <icon-loading/>
            </el-icon>
            <el-icon v-else>
              <icon-promotion/>
            </el-icon>
          </el-button>
          <router-link to="/book-history">
            <el-button :icon="IconList" circle type="warning"/>
          </router-link>
        </div>
      </div>
      <vue-draggable :list="state.bookRequests" class="tw-mt-4" item-key="id">
        <template #item="{element}">
          <el-card :body-style="{ 'background-color': element.enable ? '#e1f3d8' : '#fde2e2' }"
                   class="tw-my-2" shadow="never">
            <div class="tw-flex tw-flex-row tw-space-x-4">
              <div class="tw-flex-grow">
                <p class="tw-flex tw-justify-between tw-space-x-4">
                  <span class="tw-font-bold">
                    {{ _.get(_.find(state.stores, { id: element.storeId }), 'name') }}
                  </span>
                  <span>
                    {{
                      toDateTime(element.timeRange[0])
                        .toFormat('HH:mm')
                    }}
                    -
                    {{
                      toDateTime(element.timeRange[1])
                        .toFormat('HH:mm')
                    }}
                  </span>
                </p>
                <p class="tw-space-x-2 tw-space-y-2">
                  <el-tag v-for="item in element.days" :key="item">
                    {{ DAY_OPTIONS[item - 1] }}
                  </el-tag>
                </p>
              </div>

              <div class="tw-flex tw-flex-row tw-my-auto tw-space-x-4">
                <el-button :icon="IconEdit" circle type="primary"
                           @click="showBookRequestFormDialog(element)"/>
                <el-button :icon="IconDelete" circle type="danger"
                           @click="showBookRequestDeleteDialog(element)"/>
              </div>
            </div>
          </el-card>
        </template>
      </vue-draggable>

      <el-dialog v-model="state.isBookRequestFormDialogVisible" :close-on-click-modal="false"
                 :close-on-press-escape="false" :show-close="false" title="预约请求">
        <el-form ref="bookRequestFormRef" :model="state.bookRequestForm"
                 :rules="bookRequestFormRules" class="tw-mx-auto" label-position="right"
                 label-width="6rem">
          <el-form-item label="门店" prop="storeId">
            <el-select v-model="state.bookRequestForm.storeId" class="tw-w-full" filterable>
              <el-option v-for="item in state.stores" :key="item.id" :label="item.name"
                         :value="item.id"/>
            </el-select>
          </el-form-item>
          <el-form-item label="时间" prop="timeRange">
            <el-time-picker v-model="state.bookRequestForm.timeRange"
                            :default-value="defaultTimeRange" class="tw-w-full" format="HH:mm"
                            is-range/>
          </el-form-item>
          <el-form-item label="日期" prop="days">
            <el-select v-model="state.bookRequestForm.days" class="tw-w-full" multiple>
              <el-option v-for="(item, index) in DAY_OPTIONS" :key="index" :label="item"
                         :value="index + 1"/>
            </el-select>
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model="state.bookRequestForm.enable"/>
          </el-form-item>
        </el-form>

        <template #footer>
          <div>
            <el-button @click="state.isBookRequestFormDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveBookRequest">保存</el-button>
          </div>
        </template>
      </el-dialog>
    </el-main>
  </el-container>
</template>

<script setup>
import {
  isRef, reactive, ref, watch,
} from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Delete as IconDelete,
  Edit as IconEdit,
  Hide as IconHide,
  List as IconList,
  Loading as IconLoading,
  Plus as IconPlus,
  Promotion as IconPromotion,
  View as IconView,
} from '@element-plus/icons-vue';
import VueDraggable from 'vuedraggable';
import _ from 'lodash';
import { DateTime } from 'luxon';

const DAY_OPTIONS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const defaultTimeRange = [
  DateTime.now()
    .startOf('hour')
    .toJSDate(),
  DateTime.now()
    .startOf('hour')
    .plus({ hours: 1 })
    .toJSDate(),
];

const state = reactive({
  account: {},
  accountForm: {},
  isAccountEditing: false,
  isAccountPasswordVisible: false,
  bookRequests: [],
  stores: [],
  bookRequestForm: {},
  isBookRequestFormDialogVisible: false,
  isBookRequestProcessing: false,
});

const bookRequestFormRules = {
  storeId: [{
    required: true,
    message: '必填',
    trigger: 'blur',
  }],
  timeRange: [{
    required: true,
    message: '必填',
    trigger: 'blur',
  }],
  days: [{
    required: true,
    message: '必填',
    trigger: 'blur',
  }],
};

const bookRequestFormRef = ref();

const setAccountEditable = (editable) => {
  if (editable) {
    state.accountForm = { ...state.account };
  }
  state.isAccountEditing = editable;
};

const saveAccount = () => {
  state.account = { ...state.accountForm };
  setAccountEditable(false);
};

const validateAccount = () => {
  const account = state.isAccountEditing ? state.accountForm : state.account;
  window.electron.network('login', account.username, account.password)
    .then(() => {
      ElMessage.success('测试通过');
    })
    .catch(() => {
      ElMessage.error('测试不通过');
    });
};

const showBookRequestFormDialog = (model) => {
  state.bookRequestForm = model ? { ...model } : {};
  state.isBookRequestFormDialogVisible = true;
};

const showBookRequestDeleteDialog = (model) => {
  ElMessageBox.confirm(
    '确定删除预约请求？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(() => {
      const index = _.findIndex(state.bookRequests, (item) => item.id === model.id);
      if (index >= 0) {
        state.bookRequests.splice(index, 1);
      }
    })
    .catch(() => {
    });
};

const saveBookRequest = () => {
  bookRequestFormRef.value.validate(async (valid) => {
    if (valid) {
      const index = _.findIndex(state.bookRequests, { id: state.bookRequestForm.id });
      if (index < 0) {
        const model = {
          ...state.bookRequestForm,
          id: await window.electron.randomUUID(),
        };
        state.bookRequests.push(model);
      } else {
        state.bookRequests[index] = { ...state.bookRequestForm };
      }
      state.isBookRequestFormDialogVisible = false;
    }
  });
};

const deepUnRef = (input) => {
  if (isRef(input)) {
    return deepUnRef(input.value);
  }

  if (_.isPlainObject(input)) {
    return _.mapValues(input, deepUnRef);
  }

  if (_.isArray(input)) {
    return _.castArray(_.map(input, deepUnRef));
  }

  return input;
};

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

watch(() => state.account, (newValue) => {
  const data = _.pick(deepUnRef(newValue), ['username', 'password']);
  window.electron.database('put', 'account', data);
}, { deep: true });

watch(() => state.bookRequests, (newValue) => {
  const data = _.map(deepUnRef(newValue), (item) => _.pick(item, ['id', 'storeId', 'timeRange', 'days', 'enable']));
  window.electron.database('put', 'bookRequests', data);
}, { deep: true });

watch(() => state.isBookRequestProcessing, (newValue) => {
  window.electron.database('put', 'isBookRequestProcessing', deepUnRef(newValue));
}, { deep: true });

window.electron.onDatabasePutEvent((event, key, value) => {
  if (key === 'isBookRequestProcessing') {
    if (state.isBookRequestProcessing !== value) {
      state.isBookRequestProcessing = value;
    }
  }
});

window.electron.database('get', 'account')
  .then((data) => {
    state.account = data;
  });

window.electron.database('get', 'bookRequests')
  .then((data) => {
    state.bookRequests = data;
  });

window.electron.database('get', 'isBookRequestProcessing')
  .then((data) => {
    state.isBookRequestProcessing = data;
  });

window.electron.network('fetchStores')
  .then((data) => {
    state.stores = data;
  });
</script>

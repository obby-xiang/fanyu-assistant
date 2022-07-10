<template>
  <el-container class="tw-container tw-mx-auto tw-p-4">
    <el-main class="tw-mx-auto tw-max-w-xl">
      <h1 class="tw-text-lg tw-font-medium tw-mb-4">账号</h1>
      <el-form :model="state.accountForm" label-width="6rem" label-position="right">
        <el-form-item label="用户名">
          <el-input v-if="state.isAccountEditing" v-model="state.accountForm.username" type="text"/>
          <span v-else>{{ state.account.username }}</span>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-if="state.isAccountEditing" v-model="state.accountForm.password"
                    type="password" show-password/>
          <span v-else>
            <span>{{ state.isAccountPasswordVisible ? state.account.password : '••••••' }}</span>
            <el-button type="primary" class="tw-ml-1"
                       :icon="state.isAccountPasswordVisible ? IconView : IconHide"
                       @click="state.isAccountPasswordVisible = !state.isAccountPasswordVisible"
                       link/>
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
      <div class="tw-text-right">
        <el-button type="primary" :icon="IconPlus" @click="showBookRequestFormDialog" circle/>
      </div>
      <vue-draggable class="tw-mt-4" :list="state.bookRequests" item-key="id">
        <template #item="{element}">
          <el-card class="tw-my-2" shadow="never"
                   :body-style="{ 'background-color': element.enable ? '#e1f3d8' : '#fde2e2' }">
            <div class="tw-flex tw-flex-row tw-space-x-4">
              <div class="tw-flex-grow">
                <p class="tw-flex tw-justify-between tw-space-x-4">
                  <span class="tw-font-bold">
                    {{ _.get(_.find(state.stores, { id: element.storeId }), 'name') }}
                  </span>
                  <span>
                    {{
                      DateTime.fromJSDate(element.timeRange[0])
                        .toFormat('HH:mm')
                    }}
                    -
                    {{
                      DateTime.fromJSDate(element.timeRange[1])
                        .toFormat('HH:mm')
                    }}
                  </span>
                </p>
                <p class="tw-space-x-2 tw-space-y-2">
                  <el-tag v-for="item in element.days" :key="item">{{ DAY_OPTIONS[item] }}</el-tag>
                </p>
              </div>

              <div class="tw-flex tw-flex-row tw-my-auto tw-space-x-4">
                <el-button type="primary" :icon="IconEdit"
                           @click="showBookRequestFormDialog(element)" circle/>
                <el-button type="danger" :icon="IconDelete" circle/>
              </div>
            </div>
          </el-card>
        </template>
      </vue-draggable>

      <el-dialog v-model="state.isBookRequestFormDialogVisible" :show-close="false"
                 :close-on-click-modal="false" :close-on-press-escape="false" title="预约请求">
        <el-form ref="bookRequestFormRef" :model="state.bookRequestForm"
                 :rules="bookRequestFormRules" label-width="6rem" label-position="right"
                 class="tw-mx-auto">
          <el-form-item label="门店" prop="storeId">
            <el-select v-model="state.bookRequestForm.storeId" class="tw-w-full" filterable>
              <el-option v-for="item in state.stores" :key="item.id" :value="item.id"
                         :label="item.name"/>
            </el-select>
          </el-form-item>
          <el-form-item label="时间" prop="timeRange">
            <el-time-picker v-model="state.bookRequestForm.timeRange" format="HH:mm"
                            :default-value="defaultTimeRange" class="tw-w-full" is-range/>
          </el-form-item>
          <el-form-item label="日期" prop="days">
            <el-select v-model="state.bookRequestForm.days" class="tw-w-full" multiple>
              <el-option v-for="(item, index) in DAY_OPTIONS" :key="index" :value="index"
                         :label="item"/>
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
  reactive, ref, watch, isRef,
} from 'vue';
import { ElMessage } from 'element-plus';
import {
  View as IconView, Hide as IconHide, Plus as IconPlus, Edit as IconEdit, Delete as IconDelete,
} from '@element-plus/icons-vue';
import VueDraggable from 'vuedraggable';
import _ from 'lodash';
import { DateTime } from 'luxon';

const DAY_OPTIONS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const defaultTimeRange = [
  DateTime.now()
    .startOf('hour'),
  DateTime.now()
    .plus({ hour: 1 })
    .startOf('hour'),
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

const saveBookRequest = () => {
  bookRequestFormRef.value.validate((valid) => {
    if (valid) {
      const index = _.findIndex(state.bookRequests, { id: state.bookRequestForm.id });
      if (index < 0) {
        const model = {
          ...state.bookRequestForm,
          id: (new Date()).getTime(),
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

watch(() => state.account, (newValue) => {
  window.electron.database('put', 'account', deepUnRef(newValue));
}, { deep: true });

watch(() => state.bookRequests, (newValue) => {
  window.electron.database('put', 'bookRequests', deepUnRef(newValue));
}, { deep: true });

window.electron.database('get', 'account')
  .then((data) => {
    state.account = data;
  });

window.electron.database('get', 'bookRequests')
  .then((data) => {
    _.forEach(data, (item) => {
      item.timeRange = _.castArray(_.map(item.timeRange, (time) => DateTime.fromISO(time)
        .toJSDate()));
    });
    state.bookRequests = data;
  });

window.electron.network('fetchStores')
  .then((data) => {
    state.stores = data;
  });
</script>

<template>
  <el-container class="tw-container tw-mx-auto tw-p-4">
    <el-main class="tw-mx-auto tw-max-w-3xl">
      <el-page-header @back="router.push('/')">
        <template #content>
          <span class="tw-text-lg tw-font-medium tw-leading-none">预约记录</span>
        </template>
      </el-page-header>

      <div class="tw-mt-4">
        <el-table :data="bookedCourses" max-height="32rem">
          <el-table-column :sort-method="createCourseComparator('course')" label="课程" prop="course"
                           sortable/>
          <el-table-column :sort-method="createCourseComparator('datetime')" label="时间"
                           prop="datetime" sortable/>
          <el-table-column :sort-method="createCourseComparator('store')" label="门店" prop="store"
                           sortable/>
          <el-table-column :sort-method="createCourseComparator('bookedAt')" label="预约时间"
                           prop="bookedAt" sortable/>
        </el-table>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import _ from 'lodash';
import { DateTime } from 'luxon';

const router = useRouter();

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

const createCourseComparator = (key) => (one, another) => (one[key] ?? '').localeCompare(another[key]);

const state = reactive({
  bookedCourses: [],
});

const bookedCourses = computed(() => _.map(state.bookedCourses, (item) => ({
  course: item.course.name,
  datetime: `${item.beginTime_D} ${item.beginTime_}`,
  store: item.store.name,
  bookedAt: toDateTime(item.bookedAt)
    .toFormat('yyyy-MM-dd HH:mm:ss'),
})));

window.electron.database('get', 'bookedCourses')
  .then((data) => {
    state.bookedCourses = _.reverse(data);
  });

window.electron.onDatabasePutEvent((event, key, value) => {
  if (key === 'bookedCourses') {
    state.bookedCourses = _.reverse(value);
  }
});
</script>

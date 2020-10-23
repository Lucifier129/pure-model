import React, { useEffect } from 'react'
import Link from 'next/link'

import { useScrollToBottom } from '../../react-hooks/useScrollToBottom'
import Layout from '../../components/Layout'

import LayoutModel from '../../models/LayoutModel'
import IndexModel, { Topic } from './Model'
import * as utils from '../../utils'

export default function View() {
  let topics = IndexModel.useState((state) => state.topics)
  let showMenu = LayoutModel.useState((state) => state.showMenu)

  let layoutActions = LayoutModel.useActions()

  let actions = IndexModel.useActions()

  useScrollToBottom(async () => {
    if (showMenu) return
    await actions.getNextTopics()
  })

  useEffect(() => {
    layoutActions.openMenu()
  }, [topics])

  return (
    <Layout>
      <section id="page">
        <ul className="posts-list">
          {topics.map((topic) => (
            <TopicUI topic={topic} key={topic.id} />
          ))}
        </ul>
      </section>
    </Layout>
  )
}

function TopicUI(props: { topic: Topic }) {
  let { id, title, good, top, tab, author, reply_count, create_at, last_reply_at, visit_count } = props.topic
  return (
    <li>
      <Link href={`/topic/${id}`}>
        <div>
          <h3 className={utils.getTabClassName(tab, good, top)} title={utils.getTabStr(tab, good, top)}>
            {title}
          </h3>
          <div className="content">
            <img className="avatar" src={author.avatar_url} />
            <div className="info">
              <p>
                <span className="name">{author.loginname}</span>
                {reply_count > 0 && (
                  <span className="status">
                    <b>{reply_count}</b>/{visit_count}
                  </span>
                )}
              </p>
              <p>
                <time>{utils.getLastTimeStr(create_at, true)}</time>
                <time>{utils.getLastTimeStr(last_reply_at, true)}</time>
              </p>
            </div>
          </div>
        </div>
      </Link>
    </li>
  )
}

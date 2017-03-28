export const resolvers = {
  Query: {
    postsQuery(obj, { first, after }, context) {
      let edgesArray = [];
      return context.Post.getPostsPagination(first, after).then(posts => {

        posts.map(post => {

          edgesArray.push({
            cursor: post.id,
            node: {
              id: post.id,
              title: post.title,
              content: post.content,
            }
          });
        });

        let endCursor = edgesArray.length > 0 ? edgesArray[ edgesArray.length - 1 ].cursor : 0;

        return Promise.all([ context.Post.getTotal(), context.Post.getNextPageFlag(endCursor) ]).then((values) => {

          return {
            totalCount: values[ 0 ].count,
            edges: edgesArray,
            pageInfo: {
              endCursor: endCursor,
              hasNextPage: (values[ 1 ].count > 0 ? true : false)
            }
          };
        });
      });
    },
    post(obj, { id }, context) {
      return context.Post.getPost(id);
    },
  },
  Post: {
    comments({ id }, args, context) {
      return context.loaders.getCommentsForPostIds.load(id);
    },
  },
  Mutation: {
    addPost(obj, { title, content }, context) {
      return context.Post.addPost(title, content)
        .then((id) => context.Post.getPost(id[ 0 ]))
        .then(post => {
          //pubsub.publish('addPost', post);
          return post;
        });
    },
    deletePost(obj, { id }, context) {
      return context.Post.deletePost(id)
        .then(() => {
          //pubsub.publish('deletePost', id);
          return { id };
        });
    },
    editPost(obj, { id, title, content }, context) {
      return context.Post.editPost(id, title, content)
        .then(() => context.Post.getPost(id))
        .then(post => {
          //pubsub.publish('editPost', post);
          return post;
        });
    },
    addComment(obj, { content, postId }, context) {
      return context.Post.addComment(content, postId)
        .then((id) => context.Post.getComment(id[ 0 ]))
        .then(comment => {
          //pubsub.publish('addComment', comment);
          return comment;
        });
    },
    deleteComment(obj, { id }, context) {
      return context.Post.deleteComment(id)
        .then(() => {
          //pubsub.publish('deleteComment', id);
          return { id };
        });
    },
    editComment(obj, { id, content }, context) {
      return context.Post.editComment(id, content)
        .then(() => context.Post.getComment(id))
        .then(comment => {
          //pubsub.publish('editComment', post);
          return comment;
        });
    },
  }
};
---
layout: post
title:  "Sluggish Spring Boot Tests Riddle"
author: majid
categories: [ spring boot, tests, experience ]
image: assets/images/1.jpg
---
Most of us have faced beliefs that go unquestioned. Such ideas can vary from small daily matters such as grocery 
shopping to something as serious as religious matters. In my case, it was a professional belief, specifically whether 
or not integration tests are too slow.

There was a belief in our squad (and our chapter as well) that integration tests were slow and this belief made us not 
put this issue in our technical debts backlog and we all accepted it as a fact. It continued until the build time in 
some microservices exceeded 10 minutes and teammates started complaining about them. The first reaction was avoiding 
integration tests as much as possible and using unit tests instead. I know that it is not a wise decision against which 
there are many arguments, but It was the decision that the team made. In this post, we will see how this issue got 
resolved and the build time in our microservices decreased to half.

Finally, over a weekend, I decided to follow this issue and find an answer to the question: **Why are our integration 
tests that slow?** I started with writing down all the things I was skeptical about but my mind was just obsessed with 
**@SpringBootTest**.

## Following the first suspicion

Whenever our tests were running, I saw the Spring logo showing up several times. I thought that **@SpringBootTest** 
loaded the full application context per each test class. After a ten-minute search, I realized that all my assumptions 
were wrong. I found the point in the [Spring docs](https://docs.spring.io/autorepo/docs/spring-framework/4.2.0.RC2/spring-framework-reference/html/integration-testing.html#testcontext-ctx-management-caching):

> Once the TestContext framework loads an ApplicationContext (or WebApplicationContext) for a test, that context will 
be cached and reused for all subsequent tests that declare the same unique context configuration within the same test 
suite.

So why did it still load the context per each test class? Actually, it did not. I got this by counting the context 
loads by a specific piece of text in the log (which is repeating every time the Spring loads the application context). 
Something like this:

```commandline
mvn clean install > build-log.txt

grep "The following profiles are active: test" log.txt| wc -l
```

The result was 16 while we had 46 integration test classes in the codebase. It means that it did not load the context 
per each test class but why only 16 times?

## Digging into the test classes

After getting this weird result from counting the context loads, I checked all of the test classes one by one to find a 
clue. I realized that all of the integration test classes were annotated by **@TestPropertySource** to load one or more 
specific property files. I also had another strange finding in this investigation: **MockBean** and **SpyBean** 
annotations in integration tests. Not only I had philosophical issues with using these annotations in integration tests 
but was it screaming that: "**Hey dude, there’s a code smell here**".

I started the second round of searching and the same as the previous one, I managed to find tonnes of useful articles 
and blog posts related to the context and some clues after about only ten minutes. I found 
[this helpful blog post](https://www.baeldung.com/spring-tests) by José Carlos Valero Sánchez about optimizing 
Spring boot integration tests and 
[this one](https://rieckpil.de/improve-build-times-with-context-caching-from-spring-test/) that its author has had the 
same journey as mine.

By reading these articles and the same ones, I realized that there are some pitfalls in integration tests that prevent 
the Spring from reusing the loaded application context in integration tests. Here are the most important ones:

+ Using **@MockBean** and **@SpyBean**
+ Using **@DirtiesContext**
+ Careless use of profiles in integration tests
+ Careless use of **@TestPropertySource**

I will review all of these items in a separate blog post in detail. Now, let’s see how I boosted up our integration 
tests by two minor actions.

## Optimizing the integration tests

As I previously mentioned, there were two pitfalls in our integration test classes. The first one was annotating all of 
the integration tests with **@TestPropertySource**. I took a quick look at them and found out there were different 
combinations of property files used for each class. For example:

```java
@TestPropertySource({
    "classpath:x.properties",
    "classpath:y.properties"
})
public class TestOne{
	//...
}

@TestPropertySource({
    "classpath:z.properties",
    "classpath:y.properties"
})
public class TestTwo{
	//...
}

@TestPropertySource({
    "classpath:x.properties",
    "classpath:z.properties"
})
public class TestThree{
	//...
}

@TestPropertySource({
    "classpath:x.properties",
    "classpath:z.properties"
})
public class TestFour{
	//...
}
```

In this situation, Spring loads the context per each unique combination of property files. For instance, in the 
previous sample, it loads the context three times because x and z got repeated two times so the Spring can reuse the 
context for both of them.

So I decided to eliminate the **TestPropertySource** annotation from all of the integration test classes and aggregate 
them in an abstract class that all of them extend. Here is the new style of the test classes:

```java
@TestPropertySource({
    "classpath:x.properties",
    "classpath:y.properties",
    "classpath:z.properties"
})
public abstract class AbstractTes{
	//...
}

public class TestX extends AbstractTest{
	//...
}
```

Now, in this sample, it only loads the context once. I did something like this in the codebase and counted the context 
loads again. The result was promising: the number of context loads decreased to 2 (from 16). Note that, for example, if 
you have a property called **database.url** both in **x.properties** and **z.properties**, the second one overrides the 
first one.

I got through the remaining test classes. Guess what? All of them contained either **@MockBean** or **@SpyBean**. As I 
previously mentioned, in a separate blog post I will address the usage of these fancy annotations and the issues they 
may cause in integration tests.

## Lesson Learned

The whole process took about 3 to 4 hours. Consequently, the build time decreased from 10 to 4 minutes on Jenkins. 
It means that sometimes we could save plenty of time by investing some hours on following such issues that waste 
considerable amounts of time in the long term.

I will address the performance issues in integration tests in a separate blog post soon. I would be grateful if you 
share your comments.